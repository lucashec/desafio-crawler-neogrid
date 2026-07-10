import { Module } from '@nestjs/common';
import { InputModule } from './input/input.module';
import { QueueModule } from './queue/queue.module';
import { ScraperModule } from './scraper/scraper.module';
import { StorageModule } from './storage/storage.module';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    InputModule,
    QueueModule,
    ScraperModule,
    StorageModule,
  ],
  controllers: [],
})
export class AppModule {}
