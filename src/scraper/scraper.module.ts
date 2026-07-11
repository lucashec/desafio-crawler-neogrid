import { Module } from '@nestjs/common';
import { ScraperProcessor } from './scraper.processor';

@Module({
  providers: [ScraperProcessor],
})
export class ScraperModule {}
