/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs/promises';
import { REDIS_CLIENT, StorageService } from './storage.service';
import { ScrapeResult } from '../scraper/scraper.types';

jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
}));

describe('StorageService', () => {
  let service: StorageService;

  const redisMock = {
    del: jest.fn(),
    hset: jest.fn(),
    hgetall: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: REDIS_CLIENT,
          useValue: redisMock,
        },
      ],
    }).compile();

    service = module.get(StorageService);
  });

  describe('startTracking', () => {
    it('deve limpar os resultados e iniciar os metadados', async () => {
      await service.startTracking(10);

      expect(redisMock.del).toHaveBeenCalledWith('scraper:results');

      expect(redisMock.hset).toHaveBeenCalledWith(
        'scraper:meta',
        expect.objectContaining({
          total: 10,
          startTime: expect.any(Number),
        }),
      );
    });
  });

  describe('addResult', () => {
    it('deve armazenar um resultado no redis', async () => {
      const result: ScrapeResult = {
        product_url: 'https://produto.com',
        status: 'success',
      } as ScrapeResult;

      await service.addResult(result);

      expect(redisMock.hset).toHaveBeenCalledWith(
        'scraper:results',
        result.product_url,
        JSON.stringify(result),
      );
    });
  });

  describe('exportData', () => {
    it('não deve gerar arquivo quando não houver resultados', async () => {
      redisMock.hgetall.mockResolvedValueOnce({});

      await service.exportData();

      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('deve exportar os resultados para um arquivo json', async () => {
      const results = {
        url1: JSON.stringify({
          product_url: 'https://produto1.com',
          status: 'success',
        }),
        url2: JSON.stringify({
          product_url: 'https://produto2.com',
          status: 'failed',
        }),
      };

      redisMock.hgetall.mockResolvedValueOnce(results).mockResolvedValueOnce({
        startTime: Date.now().toString(),
      });

      await service.exportData();

      expect(fs.writeFile).toHaveBeenCalledWith(
        'products_output.json',
        JSON.stringify(
          [
            {
              product_url: 'https://produto1.com',
              status: 'success',
            },
            {
              product_url: 'https://produto2.com',
              status: 'failed',
            },
          ],
          null,
          2,
        ),
        'utf-8',
      );

      expect(redisMock.del).toHaveBeenCalledWith(
        'scraper:results',
        'scraper:meta',
      );
    });
  });
});
