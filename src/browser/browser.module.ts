import { Module } from '@nestjs/common';
import { BrowserSessionService } from './browser-session.service';

@Module({
  providers: [BrowserSessionService],
  exports: [BrowserSessionService],
})
export class BrowserModule {}
