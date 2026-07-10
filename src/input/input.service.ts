import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as xlsx from 'xlsx';

@Injectable()
export class InputService {
  private readonly logger = new Logger(InputService.name);

  constructor(
    @InjectQueue('scraper-queue') private readonly scraperQueue: Queue,
  ) {}

  async loadUrlsFromFile(filePath: string): Promise<void> {
    this.logger.log(`Iniciando leitura do arquivo Excel: ${filePath}`);

    try {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: any[] = xlsx.utils.sheet_to_json(worksheet);
      const urls = data
        .map((row: { url?: string; URL?: string }) => row.url || row.URL)
        .filter((url) => typeof url === 'string' && url.trim() !== '')
        .map((url) => url?.trim());

      if (urls?.length === 0) {
        this.logger.warn(
          'Nenhuma URL encontrada. Verifique se o cabeçalho da coluna é "url".',
        );
        return;
      }

      this.logger.log(
        `Leitura concluída. ${urls?.length} URLs encontradas. Adicionando à fila...`,
      );
      const jobs = urls?.map((url) => ({
        name: 'scrape-product',
        data: { url },
      }));

      await this.scraperQueue.addBulk(jobs);

      this.logger.log('Todas as URLs foram enviadas para a fila com sucesso!');
    } catch (error) {
      this.logger.error(`Erro ao ler o arquivo .xlsx: ${error.message!}`);
      throw error;
    }
  }
}
