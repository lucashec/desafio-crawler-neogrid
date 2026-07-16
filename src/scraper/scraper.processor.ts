import { HttpService } from '@nestjs/axios';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { isAxiosError, type AxiosRequestConfig } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import { ScrapeApiResult, ScrapeResult } from './scraper.types';

const NOT_FOUND_MESSAGE = 'produto indisponivel ou pagina nao carregada';

const AVERAGE_DELAY_MS = 2250;
const JITTER_MS = 1750;
const MIN_DELAY_MS = AVERAGE_DELAY_MS - JITTER_MS;
const MAX_DELAY_MS = AVERAGE_DELAY_MS + JITTER_MS;

const MAX_CONSECUTIVE_FORBIDDEN = 5;

@Processor('scraper-queue', {
  concurrency: 1,
})
export class ScraperProcessor extends WorkerHost {
  private readonly logger = new Logger(ScraperProcessor.name);
  private readonly cookieJar = new CookieJar();
  private consecutiveForbiddenCount = 0;

  constructor(
    private readonly http: HttpService,
    @InjectQueue('scraper-queue')
    private readonly scraperQueue: Queue,
  ) {
    super();
    wrapper(this.http.axiosRef);
  }

  private async triggerCircuitBreaker(): Promise<void> {
    const isPaused = await this.scraperQueue.isPaused();
    if (isPaused) {
      return;
    }
    await this.scraperQueue.pause();
    this.logger.error(
      `Circuit breaker acionado: ${this.consecutiveForbiddenCount} respostas 403 consecutivas do servidor. ` +
        'Fila pausada para evitar banimento definitivo. Os jobs pendentes foram preservados. ' +
        'Faça login novamente, gere um novo curl/headers e reenvie via upload para retomar o processamento.',
    );
  }

  private buildApiUrl(url: string) {
    const regex =
      /\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\?item=([0-9a-f-]{36})/i;
    const match = url.match(regex);
    if (!match) {
      throw new Error('URL inválida');
    }
    return `${process.env.SCRAPING_REFERENCE_API}$/${match[1]}/${process.env.SCRAPING_RESOURCE}/${match[2]}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getJitteredDelayMs(): number {
    return MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
  }

  private buildNotFoundResult(url: string): ScrapeResult {
    return {
      title: null,
      normal_price: null,
      discount_price: null,
      product_url: url,
      image_url: null,
      status: 'success',
      error_message: NOT_FOUND_MESSAGE,
    };
  }

  async process(
    job: Job<{ url: string; headers: Record<string, string> }>,
  ): Promise<ScrapeResult> {
    const { url, headers } = job.data;
    const delayMs = this.getJitteredDelayMs();
    this.logger.log(
      `Processando job ${job.id} (tentativa ${job.attemptsMade + 1}) - URL: ${url} - aguardando ${Math.round(delayMs)}ms (jitter)`,
    );
    await this.sleep(delayMs);
    try {
      const response = await this.http.axiosRef.get<ScrapeApiResult>(
        this.buildApiUrl(url),
        {
          headers,
          withCredentials: true,
          jar: this.cookieJar,
        } as AxiosRequestConfig & { jar: CookieJar },
      );
      this.consecutiveForbiddenCount = 0;
      if (!response.data?.data.menu) {
        this.logger.warn(`Produto não encontrado - URL: ${url}`);
        return this.buildNotFoundResult(url);
      }
      const item = response.data.data.menu[0].itens[0];
      return {
        title: item.description,
        normal_price: item.unitPrice,
        discount_price: null,
        product_url: url,
        image_url: `${process.env.SCRAPING_CDN_RESOURCE}/${item.logoUrl}`,
        status: 'success',
        error_message: null,
      };
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 404) {
        this.consecutiveForbiddenCount = 0;
        this.logger.warn(`Produto não encontrado (404) - URL: ${url}`);
        return this.buildNotFoundResult(url);
      }
      if (isAxiosError(err) && err.response?.status === 403) {
        this.consecutiveForbiddenCount += 1;
        this.logger.warn(
          `Resposta 403 (bloqueio) recebida - URL: ${url} - ocorrências consecutivas: ${this.consecutiveForbiddenCount}/${MAX_CONSECUTIVE_FORBIDDEN}`,
        );
        if (this.consecutiveForbiddenCount >= MAX_CONSECUTIVE_FORBIDDEN) {
          await this.triggerCircuitBreaker();
        }
      }
      this.logger.error(err.response?.data);
      throw err instanceof Error
        ? err
        : new Error('Erro desconhecido ao processar produto');
    }
  }
}
