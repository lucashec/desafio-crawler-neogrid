import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { ScraperQueueEvents } from './queue-events.listener';

@Module({
  imports: [
    StorageModule,
    BullModule.registerQueue({
      name: 'scraper-queue',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
      },
    }),
  ],
  providers: [ScraperQueueEvents],
  exports: [BullModule],
})
export class QueueModule {}
