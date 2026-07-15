import { Module } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT, StorageService } from './storage.service';

@Module({
  providers: [
    StorageService,
    {
      provide: REDIS_CLIENT,
      useFactory: () =>
        new Redis({
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT || '6379'),
        }),
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
