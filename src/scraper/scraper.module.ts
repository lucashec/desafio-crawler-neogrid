import { Module } from '@nestjs/common';
import { ScraperProcessor } from './scraper.processor';
import { HttpModule } from '@nestjs/axios';
import { ScraperController } from './scraper.controller';
import { FilesInputService } from './files-input.service';
import { StorageModule } from 'src/storage/storage.module';
import { QueueModule } from 'src/queue/queue.module';

@Module({
  imports: [HttpModule.register({}), StorageModule, QueueModule],
  providers: [ScraperProcessor, FilesInputService],
  controllers: [ScraperController],
})
export class ScraperModule {}
