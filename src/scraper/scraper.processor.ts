import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BrowserSessionService } from 'src/browser/browser-session.service';

const NOT_FOUND_MESSAGE = 'produto indisponivel ou pagina nao carregada';

const AVERAGE_DELAY_MS = 2250;
const JITTER_MS = 1750;
const MIN_DELAY_MS = AVERAGE_DELAY_MS - JITTER_MS;
const MAX_DELAY_MS = AVERAGE_DELAY_MS + JITTER_MS;

const NAVIGATION_TIMEOUT_MS = 30000;

export interface ScrapeResult {
  title: string | null;
  normal_price: number | null;
  discount_price: number | null;
  product_url: string;
  image_url: string | null;
  status: 'success' | 'error';
  error_message: string | null;
}

interface ProductApiResponse {
  data?: {
    menu?: {
      itens?: {
        description: string;
        unitPrice: number;
        logoUrl: string;
      }[];
    }[];
  };
}

@Processor('scraper-queue', {
  concurrency: 1,
})
export class ScraperProcessor extends WorkerHost {
  private readonly logger = new Logger(ScraperProcessor.name);

  constructor(private readonly browserSession: BrowserSessionService) {
    super();
  }

  private parseProductUrl(url: string): { merchantId: string; itemId: string } {
    const regex =
      /\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\?item=([0-9a-f-]{36})/i;
    const match = url.match(regex);
    if (!match) {
      throw new Error('URL inválida');
    }
    return { merchantId: match[1], itemId: match[2] };
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

  async process(job: Job<{ url: string }>): Promise<ScrapeResult> {
    const { url } = job.data;
    const delayMs = this.getJitteredDelayMs();
    this.logger.log(
      `Processando job ${job.id} (tentativa ${job.attemptsMade + 1}) - URL: ${url} - aguardando ${Math.round(delayMs)}ms (jitter)`,
    );
    await this.sleep(delayMs);

    const { merchantId, itemId } = this.parseProductUrl(url);
    const apiUrlMatcher = (responseUrl: string) =>
      responseUrl.includes(`/restaurant/${merchantId}/items/${itemId}`);

    try {
      console.log(await this.browserSession.cookies());
      const page = await this.browserSession.getPage();
      const capturePromise = this.browserSession.waitForApiResponse(
        apiUrlMatcher,
        NAVIGATION_TIMEOUT_MS,
      );

      const [, captureResult] = await Promise.all([
        page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: NAVIGATION_TIMEOUT_MS,
        }),
        capturePromise,
      ]);

      if (captureResult.status === 404) {
        this.logger.warn(`Produto não encontrado (404) - URL: ${url}`);
        return this.buildNotFoundResult(url);
      }
      if (captureResult.status < 200 || captureResult.status >= 300) {
        throw new Error(
          `API do produto retornou status ${captureResult.status}`,
        );
      }

      const body = captureResult.json as ProductApiResponse | null;
      const item = body?.data?.menu?.[0]?.itens?.[0];
      if (!item) {
        this.logger.warn(`Produto não encontrado - URL: ${url}`);
        return this.buildNotFoundResult(url);
      }

      return {
        title: item.description,
        normal_price: item.unitPrice,
        discount_price: null,
        product_url: url,
        image_url: `https://static.ifood-static.com.br/image/upload/t_high/pratos/${item.logoUrl}`,
        status: 'success',
        error_message: null,
      };
    } catch (err) {
      throw err instanceof Error
        ? err
        : new Error('Erro desconhecido ao processar produto');
    }
  }
}
