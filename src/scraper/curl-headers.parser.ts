import { Injectable } from '@nestjs/common';

@Injectable()
export class CurlHeadersParser {
  private readonly headerRegex = /-(H|b)\s+['"]([^'"]+)['"]/g;

  parse(curl: string): Record<string, string> {
    const headers: Record<string, string> = {};
    const regex = new RegExp(this.headerRegex);

    let match: RegExpExecArray | null;
    while ((match = regex.exec(curl)) !== null) {
      const [, type, value] = match;

      if (type === 'b') {
        headers.Cookie = value;
        continue;
      }

      const index = value.indexOf(':');
      if (index === -1) continue;

      headers[value.slice(0, index).trim()] = value.slice(index + 1).trim();
    }

    return headers;
  }
}
