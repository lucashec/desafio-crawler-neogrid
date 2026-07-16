import { Module } from '@nestjs/common';
import { PlaywrightAuthService } from './playwright-auth.service';
import { AuthController } from './auth.controller';

@Module({
  providers: [PlaywrightAuthService],
  controllers: [AuthController],
  exports: [PlaywrightAuthService],
})
export class AuthModule {}
