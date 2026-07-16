import { Injectable } from '@nestjs/common';

const AVERAGE_DELAY_MS = 2250;
const JITTER_MS = 1750;
const MIN_DELAY_MS = AVERAGE_DELAY_MS - JITTER_MS;
const MAX_DELAY_MS = AVERAGE_DELAY_MS + JITTER_MS;

@Injectable()
export class JitterDelayService {
  getDelayMs(): number {
    return MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
  }

  async wait(): Promise<number> {
    const delayMs = this.getDelayMs();
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return delayMs;
  }
}
