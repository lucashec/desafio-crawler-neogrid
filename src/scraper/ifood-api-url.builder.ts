import { Injectable } from '@nestjs/common';
import { InvalidProductUrlError } from './scraper.errors';

@Injectable()
export class IfoodApiUrlBuilder {
  private readonly urlRegex =
    /\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\?item=([0-9a-f-]{36})/i;

  build(productUrl: string): string {
    const match = productUrl.match(this.urlRegex);
    if (!match) {
      throw new InvalidProductUrlError(productUrl);
    }
    const [, merchantId, itemId] = match;
    return `https://www.ifood.com.br/site-api/v1/merchants/restaurant/${merchantId}/items/${itemId}`;
  }
}
