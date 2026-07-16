import { Controller, Post } from '@nestjs/common';
import { PlaywrightAuthService } from './playwright-auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly playwrightAuthService: PlaywrightAuthService) {}

  @Post('login')
  async login() {
    await this.playwrightAuthService.ensureAuthenticated();
    return { message: 'Fluxo de autenticação concluído' };
  }
}
