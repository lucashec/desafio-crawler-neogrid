/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import * as XLSX from 'xlsx';
import { StorageService } from 'src/storage/storage.service';

@Injectable()
export class FilesInputService {
  constructor(
    @InjectQueue('scraper-queue') private readonly scraperQueue: Queue,
    private readonly storageService: StorageService,
  ) {}
  async reset() {
    return await this.scraperQueue.obliterate({ force: true });
  }
  async updateHeadersAndResume(headersFile: Express.Multer.File) {
    const headers = this.parseHeaders(headersFile.buffer.toString('utf8'));

    const jobs = await this.scraperQueue.getJobs([
      'waiting',
      'delayed',
      'paused',
      'active',
      'prioritized',
    ]);

    await Promise.all(
      jobs.map((job) => job.updateData({ ...job.data, headers })),
    );

    await this.scraperQueue.resume();

    return jobs.length;
  }
  parseHeaders(curl: string): Record<string, string> {
    const headers: Record<string, string> = {};

    const regex = /-(H|b)\s+['"]([^'"]+)['"]/g;

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
    await this.storageService.startTracking(urls.length);
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
