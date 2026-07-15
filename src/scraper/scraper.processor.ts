import { HttpService } from '@nestjs/axios';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, NotFoundException } from '@nestjs/common';
import { Job } from 'bullmq';
import { StorageService } from 'src/storage/storage.service';

@Processor('scraper-queue', { concurrency: 5 })
export class ScraperProcessor extends WorkerHost {
  private readonly logger = new Logger(ScraperProcessor.name);
  constructor(
    private readonly http: HttpService,
    private readonly storageService: StorageService,
  ) {
    super();
  }

  private buildApiUrl(url: string) {
    const regex =
      /\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\?item=([0-9a-f-]{36})/i;
    const match = url.match(regex);
    if (!match) {
      throw new Error('URL inválida');
    }
    return `https://www.ifood.com.br/site-api/v1/merchants/restaurant/${match[1]}/items/${match[2]}`;
  }

  delay(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, 2000); // 2000 ms = 2 segundos
    });
  }

  async process(job: Job<{ url: string; headers: any }>): Promise<any> {
    const { url, headers } = job.data;
    this.logger.log(`Processando job ${job.id} - URL: ${url}`);
    try {
      await this.delay();
      const response: {
        data: {
          data: {
            menu: {
              itens: {
                description: string;
                unitPrice: number;
                logoUrl: string;
              }[];
            }[];
          };
        };
      } = await this.http.axiosRef.get(this.buildApiUrl(url), {
        headers,
      });
      if (!response.data?.data.menu) {
        console.log(response.data?.data);
        throw new NotFoundException('nao encontrado');
      }
      const item = response.data.data.menu[0].itens[0];
      console.log(item.description);
      this.storageService.addResult({
        title: item.description,
        normal_price: item.unitPrice,
        discount_price: null,
        product_url: url,
        image_url: `https://static.ifood-static.com.br/image/upload/t_high/pratos/${item.logoUrl}`,
        status: 'sucess',
        error_message: null,
      });
    } catch (err) {
      this.storageService.addResult({
        title: null,
        normal_price: null,
        discount_price: null,
        product_url: url,
        image_url: null,
        status: 'error',
        error_message: 'Produto indisponivel ou pagina nao carregada',
      });
    }
  }
}
