import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ForbiddenAccessError, ProductNotFoundError } from './scraper.errors';
import { ScrapeJobData, ScrapeResult } from './scraper.types';
import { CircuitBreakerService } from './circuit-breaker.service';
import { JitterDelayService } from './jitter-delay.service';
import {
  PRODUCT_PAGE_CLIENT,
  type ProductPageClient,
} from './product-page-client';

const NOT_FOUND_MESSAGE = 'produto indisponivel ou pagina nao carregada';

@Processor('scraper-queue', {
  concurrency: 1,
})
export class ScraperProcessor extends WorkerHost {
  private readonly logger = new Logger(ScraperProcessor.name);

  constructor(
    @Inject(PRODUCT_PAGE_CLIENT)
    private readonly productPageClient: ProductPageClient,
    private readonly jitterDelay: JitterDelayService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {
    super();
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

  async process(job: Job<ScrapeJobData>): Promise<ScrapeResult> {
    const { url, headers } = job.data;
    const delayMs = await this.jitterDelay.wait();
    this.logger.log(
      `Processando job ${job.id} (tentativa ${job.attemptsMade + 1}) - URL: ${url} - aguardou ${Math.round(delayMs)}ms (jitter)`,
    );

    try {
      const { item } = await this.productPageClient.fetchProduct(url, headers);
      this.circuitBreaker.reset();

      if (!item) {
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
      if (err instanceof ProductNotFoundError) {
        this.circuitBreaker.reset();
        this.logger.warn(err.message);
        return this.buildNotFoundResult(url);
      }
      if (err instanceof ForbiddenAccessError) {
        await this.circuitBreaker.registerForbidden(url);
      }
      throw err;
    }
  }
}
