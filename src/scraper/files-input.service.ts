import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import * as XLSX from 'xlsx';
import { StorageService } from 'src/storage/storage.service';
import { CurlHeadersParser } from './curl-headers.parser';
import { ScrapeJobData } from './scraper.types';

interface ProductSheetRow {
  url?: string;
  URL?: string;
}

@Injectable()
export class FilesInputService {
  constructor(
    @InjectQueue('scraper-queue')
    private readonly scraperQueue: Queue<ScrapeJobData>,
    private readonly storageService: StorageService,
    private readonly curlHeadersParser: CurlHeadersParser,
  ) {}

  async reset() {
    return await this.scraperQueue.obliterate({ force: true });
  }

  async updateHeadersAndResume(headersFile: Express.Multer.File) {
    const headers = this.curlHeadersParser.parse(
      headersFile.buffer.toString('utf8'),
    );

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

  async processFiles(
    xlsxFile: Express.Multer.File,
    headersFile: Express.Multer.File,
  ) {
    const headers = this.curlHeadersParser.parse(
      headersFile.buffer.toString('utf8'),
    );
    const workbook = XLSX.read(xlsxFile.buffer, {
      type: 'buffer',
    });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const data = XLSX.utils.sheet_to_json<ProductSheetRow>(worksheet);

    const urls = data
      .map((row) => row.url ?? row.URL)
      .filter((url): url is string => Boolean(url));

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
