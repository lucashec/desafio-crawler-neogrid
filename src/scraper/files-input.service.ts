/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import * as XLSX from 'xlsx';

@Injectable()
export class FilesInputService {
  constructor(
    @InjectQueue('scraper-queue') private readonly scraperQueue: Queue,
  ) {}
  async reset() {
    return await this.scraperQueue.obliterate({ force: true });
  }
  parseHeaders(text: string): Record<string, string> {
    return text
      .split('\n')
      .filter(Boolean)
      .reduce(
        (acc, line) => {
          const index = line.indexOf(':');

          if (index === -1) return acc;

          const key = line.slice(0, index).trim();
          const value = line.slice(index + 1).trim();

          acc[key] = value;

          return acc;
        },
        {} as Record<string, string>,
      );
  }
  async processFiles(
    xlsxFile: Express.Multer.File,
    headersFile: Express.Multer.File,
  ) {
    const headers = this.parseHeaders(headersFile.buffer.toString('utf8'));
    const workbook = XLSX.read(xlsxFile.buffer, {
      type: 'buffer',
    });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const data = XLSX.utils.sheet_to_json(worksheet);

    const urls = data.map((row: any) => row.url || row.URL).filter(Boolean);
    await this.scraperQueue.addBulk(
      urls.map((url) => ({
        name: 'scrape-product',
        data: {
          url,
          headers,
        },
      })),
    );
  }
}
