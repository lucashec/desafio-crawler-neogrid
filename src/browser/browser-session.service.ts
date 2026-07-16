import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
  type Response,
} from 'playwright';
import * as fs from 'fs/promises';
import { AUTH_STORAGE_STATE_PATH } from 'src/auth/playwright-auth.service';

export interface ApiCaptureResult {
  status: number;
  json: unknown;
}

interface PendingCapture {
  matches: (responseUrl: string) => boolean;
  resolve: (result: ApiCaptureResult) => void;
}

@Injectable()
export class BrowserSessionService implements OnModuleDestroy {
  private readonly logger = new Logger(BrowserSessionService.name);
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;
  private pendingCapture?: PendingCapture;

  async cookies() {
    return await this.context?.cookies();
  }

  async getPage(): Promise<Page> {
    if (this.page) {
      return this.page;
    }
    await this.assertAuthFileExists();

    this.logger.log(
      `Abrindo navegador (headless) com sessão de ${AUTH_STORAGE_STATE_PATH}...`,
    );
    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext({
      storageState: AUTH_STORAGE_STATE_PATH,
    });
    this.page = await this.context.newPage();
    this.page.on('response', (response) => this.handleResponse(response));
    return this.page;
  }

  waitForApiResponse(
    matches: (responseUrl: string) => boolean,
    timeoutMs: number,
  ): Promise<ApiCaptureResult> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingCapture = undefined;
        reject(
          new Error(
            `Timeout aguardando a resposta da API do produto (${timeoutMs}ms)`,
          ),
        );
      }, timeoutMs);

      this.pendingCapture = {
        matches,
        resolve: (result) => {
          clearTimeout(timer);
          resolve(result);
        },
      };
    });
  }

  private async handleResponse(response: Response): Promise<void> {
    const pending = this.pendingCapture;
    if (!pending || !pending.matches(response.url())) {
      return;
    }
    this.pendingCapture = undefined;

    let json: unknown = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }
    pending.resolve({ status: response.status(), json });
  }

  private async assertAuthFileExists(): Promise<void> {
    try {
      await fs.access(AUTH_STORAGE_STATE_PATH);
    } catch {
      throw new Error(
        `Sessão não encontrada (${AUTH_STORAGE_STATE_PATH}). Faça login via POST /auth/login ou POST /scraper/upload antes de rodar o crawler.`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.browser?.close();
  }
}
