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

  // Executa quando a aplicação é encerrada
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
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // TODO: Aqui entrará a lógica dos seletores CSS para extrair:
      const title = 'TODO: Extrair título';
      const normalPrice = 'TODO: Extrair preço normal';
      const discountPrice = null;
      const imageUrl = 'TODO: Extrair imagem';

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
