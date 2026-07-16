import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ScrapeJobData } from './scraper.types';

const MAX_CONSECUTIVE_FORBIDDEN = 5;

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private consecutiveForbiddenCount = 0;

  constructor(
    @InjectQueue('scraper-queue')
    private readonly scraperQueue: Queue<ScrapeJobData>,
  ) {}

  reset(): void {
    this.consecutiveForbiddenCount = 0;
  }

  async registerForbidden(url: string): Promise<void> {
    this.consecutiveForbiddenCount += 1;
    this.logger.warn(
      `Resposta 403 (bloqueio) recebida - URL: ${url} - ocorrências consecutivas: ${this.consecutiveForbiddenCount}/${MAX_CONSECUTIVE_FORBIDDEN}`,
    );

    if (this.consecutiveForbiddenCount >= MAX_CONSECUTIVE_FORBIDDEN) {
      await this.trip();
    }
  }

  private async trip(): Promise<void> {
    const isPaused = await this.scraperQueue.isPaused();
    if (isPaused) {
      return;
    }
    await this.scraperQueue.pause();
    this.logger.error(
      `Circuit breaker acionado: ${this.consecutiveForbiddenCount} respostas 403 consecutivas do iFood. ` +
        'Fila pausada para evitar banimento definitivo. Os jobs pendentes foram preservados. ' +
        'Faça login novamente, gere um novo curl/headers e reenvie via POST /scraper/resume para retomar o processamento.',
    );
  }
}
