import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private results: any[] = [];
  private startTime: number;

  startTracking(totalUrls: number) {
    this.results = [];
    this.startTime = Date.now();
    this.logger.log(`Iniciando rastreamento para ${totalUrls} URLs...`);
  }

  addResult(data: any) {
    this.results.push(data);
  }

  async exportData() {
    if (this.results.length === 0) return;

    const total = this.results.length;
    const successes = this.results.filter((r) => r.status === 'success').length;
    const failures = total - successes;
    const successRate = ((successes / total) * 100).toFixed(2);
    const executionTimeMinutes = (
      (Date.now() - this.startTime) /
      60000
    ).toFixed(2);

    // Gerando o arquivo products_output.json
    const fileName = 'products_output.json';
    await fs.writeFile(
      fileName,
      JSON.stringify(this.results, null, 2),
      'utf-8',
    );

    this.logger.log('--- RESUMO DA EXECUÇÃO ---');
    this.logger.log(`Total de URLs processadas: ${total}`);
    this.logger.log(`Sucessos: ${successes}`);
    this.logger.log(`Falhas: ${failures}`);
    this.logger.log(`Taxa de sucesso: ${successRate}%`);
    this.logger.log(`Tempo total de execução: ${executionTimeMinutes} minutos`);
    this.logger.log(`Arquivo salvo como: ${fileName}`);
    this.logger.log('--------------------------');
  }
}
