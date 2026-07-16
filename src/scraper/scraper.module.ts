import { Module } from '@nestjs/common';
import { ScraperProcessor } from './scraper.processor';
import { ScraperController } from './scraper.controller';
import { FilesInputService } from './files-input.service';
import { StorageModule } from 'src/storage/storage.module';
import { QueueModule } from 'src/queue/queue.module';
import { AuthModule } from 'src/auth/auth.module';
import { BrowserModule } from 'src/browser/browser.module';

@Module({
  imports: [StorageModule, QueueModule, AuthModule, BrowserModule],
  providers: [ScraperProcessor, FilesInputService],
  controllers: [ScraperController],
})
export class ScraperModule {}
