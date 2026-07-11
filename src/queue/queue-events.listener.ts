import {
  QueueEventsListener,
  QueueEventsHost,
  OnQueueEvent,
} from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';

@QueueEventsListener('scraper-queue')
export class ScraperQueueEvents extends QueueEventsHost {
  private readonly logger = new Logger(ScraperQueueEvents.name);

  constructor(private readonly storageService: StorageService) {
    super();
  }

  @OnQueueEvent('completed')
  onCompleted({ jobId, returnvalue }: { jobId: string; returnvalue: string }) {
    const result = JSON.parse(returnvalue);
    this.logger.log(`Job ${jobId} concluído. Salvando resultado...`);
    this.storageService.addResult(result);
  }

  @OnQueueEvent('failed')
  onFailed({ jobId, failedReason }: { jobId: string; failedReason: string }) {
    this.logger.error(`Job ${jobId} falhou criticamente: ${failedReason}`);
    this.storageService.addResult({
      title: null,
      normal_price: null,
      discount_price: null,
      product_url: `Job ID: ${jobId}`,
      image_url: null,
      status: 'error',
      error_message: failedReason,
    });
  }

  @OnQueueEvent('drained')
  async onDrained() {
    this.logger.log(
      'Fila esvaziada! Iniciando a exportação do arquivo final...',
    );
    await this.storageService.exportData();
  }
}
