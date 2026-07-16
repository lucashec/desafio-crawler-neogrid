import {
  QueueEventsListener,
  QueueEventsHost,
  OnQueueEvent,
  InjectQueue,
} from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { StorageService } from '../storage/storage.service';
import { ScrapeJobData, ScrapeResult } from '../scraper/scraper.types';

@QueueEventsListener('scraper-queue')
export class ScraperQueueEvents extends QueueEventsHost {
  private readonly logger = new Logger(ScraperQueueEvents.name);

  constructor(
    private readonly storageService: StorageService,
    @InjectQueue('scraper-queue')
    private readonly scraperQueue: Queue<ScrapeJobData>,
  ) {
    super();
  }

  private async checkIfDrainedAndExport() {
    const pending = await this.scraperQueue.getJobCountByTypes(
      'waiting',
      'active',
      'delayed',
      'paused',
      'prioritized',
    );
    if (pending === 0) {
      this.logger.log(
        'Fila esvaziada! Iniciando a exportação do arquivo final...',
      );
      await this.storageService.exportData();
    }
  }

  @OnQueueEvent('completed')
  async onCompleted({
    jobId,
    returnvalue,
  }: {
    jobId: string;
    returnvalue: ScrapeResult;
  }) {
    this.logger.log(`Job ${jobId} concluído. Salvando resultado...`);
    await this.storageService.addResult(returnvalue);
    await this.checkIfDrainedAndExport();
  }

  @OnQueueEvent('failed')
  async onFailed({
    jobId,
    failedReason,
  }: {
    jobId: string;
    failedReason: string;
  }) {
    const job = await this.scraperQueue.getJob(jobId);
    const productUrl = job?.data.url ?? `Job ID: ${jobId}`;
    this.logger.error(
      `Job ${jobId} falhou após esgotar as tentativas: ${failedReason}`,
    );
    await this.storageService.addResult({
      title: null,
      normal_price: null,
      discount_price: null,
      product_url: productUrl,
      image_url: null,
      status: 'error',
      error_message: failedReason,
    });
    await this.checkIfDrainedAndExport();
  }
}
