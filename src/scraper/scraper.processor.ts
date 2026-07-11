import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { chromium, Browser } from 'playwright';

@Processor('scraper-queue', { concurrency: 5 })
export class ScraperProcessor
  extends WorkerHost
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ScraperProcessor.name);
  private browser: Browser;

  async onModuleInit() {
    this.logger.log('Iniciando o navegador (Playwright)...');
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      this.logger.log('Navegador encerrado.');
    }
  }

  async process(job: Job<{ url: string }>, token?: string): Promise<any> {
    const { url } = job.data;
    this.logger.log(`Processando job ${job.id} - URL: ${url}`);

    const context = await this.browser.newContext();
    const page = await context.newPage();

    try {
      // Navega até a URL com um timeout configurado (evita travar em páginas lentas)
      await page.waitForTimeout(Math.random() * 2000);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('h1', { timeout: 15000 });
      const imageLocator = page.locator('img[src*="ifood-static"]').first();
      const hasImage = (await imageLocator.count()) > 0;
      const imageUrl = hasImage ? await imageLocator.getAttribute('src') : null;
      let normalPrice: string | null = null;
      let discountPrice: string | null = null;

      const priceElements = await page
        .locator('text=/R\\$\\s*\\d+(?:,\\d{2})?/')
        .allTextContents();

      if (priceElements.length > 0) {
        const cleanPrices = priceElements.map((p) =>
          p.replace(/\s+/g, ' ').trim(),
        );

        if (cleanPrices.length === 1) {
          normalPrice = cleanPrices[0];
        } else if (cleanPrices.length >= 2) {
          normalPrice = cleanPrices[0];
          discountPrice = cleanPrices[1];
        }
      }

      const title = await page
        .locator('h1')
        .first()
        .textContent()
        .then((t) => t?.trim() || null);
      const result = {
        title,
        normal_price: normalPrice,
        discount_price: discountPrice,
        product_url: url,
        image_url: imageUrl,
        status: 'success',
        error_message: null,
      };
      this.logger.log(`Sucesso ao extrair dados do job ${job.id}`);
      this.logger.log(`Resultado: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`Erro ao processar a URL ${url}: ${error.message}`);
      return {
        title: null,
        normal_price: null,
        discount_price: null,
        product_url: url,
        image_url: null,
        status: 'error',
        error_message: error.message,
      };
    } finally {
      await context.close();
    }
  }
}
