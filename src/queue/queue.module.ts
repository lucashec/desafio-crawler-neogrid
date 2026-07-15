import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'scraper-queue',
      defaultJobOptions: {
        attempts: 3,
        delay: 2000,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
