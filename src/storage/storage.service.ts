import { Inject, Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import Redis from 'ioredis';
import { ScrapeResult } from 'src/scraper/scraper.processor';

export const REDIS_CLIENT = 'REDIS_CLIENT';

const RESULTS_KEY = 'scraper:results';
const META_KEY = 'scraper:meta';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async startTracking(totalUrls: number) {
    await this.redis.del(RESULTS_KEY);
    await this.redis.hset(META_KEY, {
      total: totalUrls,
      startTime: Date.now(),
    });
    this.logger.log(`Iniciando rastreamento para ${totalUrls} URLs...`);
  }

  async addResult(data: ScrapeResult) {
    await this.redis.hset(RESULTS_KEY, data.product_url, JSON.stringify(data));
  }

  async exportData() {
    const rawResults = await this.redis.hgetall(RESULTS_KEY);
    const results = Object.values(rawResults).map(
      (value) => JSON.parse(value) as ScrapeResult,
    );

    if (results.length === 0) return;

    const meta = await this.redis.hgetall(META_KEY);
    const startTime = meta.startTime ? Number(meta.startTime) : Date.now();

    const total = results.length;
    const successes = results.filter((r) => r.status === 'success').length;
    const failures = total - successes;
    const successRate = ((successes / total) * 100).toFixed(2);
    const executionTimeMinutes = ((Date.now() - startTime) / 60000).toFixed(2);

    const fileName = 'products_output.json';
    await fs.writeFile(fileName, JSON.stringify(results, null, 2), 'utf-8');

    this.logger.log('--- RESUMO DA EXECUÇÃO ---');
    this.logger.log(`Total de URLs processadas: ${total}`);
    this.logger.log(`Sucessos: ${successes}`);
    this.logger.log(`Falhas: ${failures}`);
    this.logger.log(`Taxa de sucesso: ${successRate}%`);
    this.logger.log(`Tempo total de execução: ${executionTimeMinutes} minutos`);
    this.logger.log(`Arquivo salvo como: ${fileName}`);
    this.logger.log('--------------------------');

    await this.redis.del(RESULTS_KEY, META_KEY);
  }
}
