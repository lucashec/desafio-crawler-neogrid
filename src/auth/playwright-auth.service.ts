import { Injectable, Logger } from '@nestjs/common';
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';

export const AUTH_STORAGE_STATE_PATH = path.resolve(
  process.cwd(),
  process.env.AUTH_STORAGE_STATE_PATH || 'auth.json',
);

const LOGIN_URL =
  process.env.AUTH_LOGIN_URL || 'https://www.ifood.com.br/entrar';

const LOGIN_POLL_INTERVAL_MS = 2000;
const AUTH_COOKIE_NAME = 'aRefreshToken';

@Injectable()
export class PlaywrightAuthService {
  private readonly logger = new Logger(PlaywrightAuthService.name);

  async ensureAuthenticated(): Promise<void> {
    const hasSession = await this.hasSavedSession();

    if (hasSession) {
      this.logger.log(
        `Sessão encontrada em ${AUTH_STORAGE_STATE_PATH}. Validando...`,
      );

      const valid = await this.isSessionValid();

      if (valid) {
        this.logger.log('Sessão válida. Reutilizando sessão existente.');
        return;
      }

      this.logger.warn('Sessão expirada ou inválida. Descartando auth.json.');
      await this.invalidateSession();
    } else {
      this.logger.log('Nenhuma sessão salva encontrada.');
    }

    await this.login();
  }

  private async hasSavedSession(): Promise<boolean> {
    try {
      await fs.access(AUTH_STORAGE_STATE_PATH);
      return true;
    } catch {
      return false;
    }
  }

  private async invalidateSession(): Promise<void> {
    await fs.rm(AUTH_STORAGE_STATE_PATH, { force: true });
  }

  private async isSessionValid(): Promise<boolean> {
    let browser: Browser | undefined;

    try {
      browser = await chromium.launch({ headless: true });

      const context = await browser.newContext({
        storageState: AUTH_STORAGE_STATE_PATH,
      });

      return await this.isContextAuthenticated(context);
    } catch (err) {
      this.logger.error(`Erro ao validar sessão: ${(err as Error).message}`);
      return false;
    } finally {
      await browser?.close();
    }
  }

  private async login(): Promise<void> {
    this.logger.log('Iniciando login manual. Abrindo navegador...');

    const browser = await chromium.launch({ headless: false });

    let context: BrowserContext | undefined;

    try {
      context = await browser.newContext();

      const page = await context.newPage();

      await page.goto(LOGIN_URL, {
        waitUntil: 'domcontentloaded',
      });

      this.logger.log(
        `Aguardando autenticação (cookie "${AUTH_COOKIE_NAME}")...`,
      );

      await this.waitForLoginCompletion(page, context);

      await context.storageState({
        path: AUTH_STORAGE_STATE_PATH,
      });

      this.logger.log(
        `Sessão autenticada e salva em ${AUTH_STORAGE_STATE_PATH}`,
      );
    } finally {
      await browser.close();
    }
  }

  private async waitForLoginCompletion(
    page: Page,
    context: BrowserContext,
  ): Promise<void> {
    while (true) {
      await page.waitForTimeout(LOGIN_POLL_INTERVAL_MS);

      const authenticated = await this.isContextAuthenticated(context);

      if (authenticated) {
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        return;
      }
    }
  }

  private async isContextAuthenticated(
    context: BrowserContext,
  ): Promise<boolean> {
    const cookies = await context.cookies();

    return cookies.some((cookie) => cookie.name === AUTH_COOKIE_NAME);
  }
}
