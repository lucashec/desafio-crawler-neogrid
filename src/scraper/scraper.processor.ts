import { HttpService } from '@nestjs/axios';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { isAxiosError } from 'axios';

const NOT_FOUND_MESSAGE = 'produto indisponivel ou pagina nao carregada';

export interface ScrapeResult {
  title: string | null;
  normal_price: number | null;
  discount_price: number | null;
  product_url: string;
  image_url: string | null;
  status: 'success' | 'error';
  error_message: string | null;
}

@Processor('scraper-queue', {
  concurrency: 1,
  limiter: { max: 1, duration: 2000 },
})
export class ScraperProcessor extends WorkerHost {
  private readonly logger = new Logger(ScraperProcessor.name);
  constructor(private readonly http: HttpService) {
    super();
  }

  private buildApiUrl(url: string) {
    const regex =
      /\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\?item=([0-9a-f-]{36})/i;
    const match = url.match(regex);
    if (!match) {
      throw new Error('URL inválida');
    }
    return `https://www.ifood.com.br/site-api/v1/merchants/restaurant/${match[1]}/items/${match[2]}`;
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
    this.logger.log(
      `Processando job ${job.id} (tentativa ${job.attemptsMade + 1}) - URL: ${url}`,
    );
    try {
      const response = await this.http.axiosRef.get<{
        data: {
          menu: {
            itens: {
              description: string;
              unitPrice: number;
              logoUrl: string;
            }[];
          }[];
        };
      }>(this.buildApiUrl(url), {
        headers,
      });
      if (!response.data?.data.menu) {
        this.logger.warn(`Produto não encontrado - URL: ${url}`);
        return this.buildNotFoundResult(url);
      }
      const item = response.data.data.menu[0].itens[0];
      console.log(response.data?.data?.menu[0]?.itens[0]?.description);
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
      if (isAxiosError(err) && err.response?.status === 404) {
        this.logger.warn(`Produto não encontrado (404) - URL: ${url}`);
        return this.buildNotFoundResult(url);
      }
      throw err instanceof Error
        ? err
        : new Error('Erro desconhecido ao processar produto');
    }
  }
}
