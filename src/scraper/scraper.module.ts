import { Module } from '@nestjs/common';
import { ScraperProcessor } from './scraper.processor';
import { HttpModule } from '@nestjs/axios';
import { ScraperController } from './scraper.controller';
import { FilesInputService } from './files-input.service';
import { CurlHeadersParser } from './curl-headers.parser';
import { IfoodApiUrlBuilder } from './ifood-api-url.builder';
import { JitterDelayService } from './jitter-delay.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { AxiosIfoodProductClient } from './axios-ifood-product.client';
import { PRODUCT_PAGE_CLIENT } from './product-page-client';
import { StorageModule } from '../storage/storage.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [HttpModule.register({}), StorageModule, QueueModule],
  providers: [
    ScraperProcessor,
    FilesInputService,
    CurlHeadersParser,
    IfoodApiUrlBuilder,
    JitterDelayService,
    CircuitBreakerService,
    AxiosIfoodProductClient,
    {
      provide: PRODUCT_PAGE_CLIENT,
      useExisting: AxiosIfoodProductClient,
    },
  ],
  controllers: [ScraperController],
})
export class ScraperModule {}
