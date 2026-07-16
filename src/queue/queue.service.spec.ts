/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ScraperQueueEvents } from './queue-events.listener';
import { StorageService } from '../storage/storage.service';

describe('ScraperQueueEvents', () => {
  let listener: ScraperQueueEvents;

  const storageServiceMock = {
    addResult: jest.fn(),
    exportData: jest.fn(),
  };

  const queueMock = {
    getJobCountByTypes: jest.fn(),
    getJob: jest.fn(),
  } as Partial<Queue>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScraperQueueEvents,
        {
          provide: StorageService,
          useValue: storageServiceMock,
        },
        {
          provide: getQueueToken('scraper-queue'),
          useValue: queueMock,
        },
      ],
    }).compile();

    listener = module.get(ScraperQueueEvents);
  });

  describe('onCompleted', () => {
    it('deve salvar o resultado e exportar quando a fila estiver vazia', async () => {
      queueMock.getJobCountByTypes = jest.fn().mockResolvedValue(0);

      const result = {
        product_url: 'https://produto.com',
        title: 'Produto',
        status: 'success',
      };

      await listener.onCompleted({
        jobId: '1',
        returnvalue: result as any,
      });

      expect(storageServiceMock.addResult).toHaveBeenCalledWith(result);

      expect(queueMock.getJobCountByTypes).toHaveBeenCalled();

      expect(storageServiceMock.exportData).toHaveBeenCalled();
    });

    it('não deve exportar quando ainda houver jobs pendentes', async () => {
      queueMock.getJobCountByTypes = jest.fn().mockResolvedValue(3);

      await listener.onCompleted({
        jobId: '1',
        returnvalue: {
          product_url: 'https://produto.com',
          status: 'success',
        } as any,
      });

      expect(storageServiceMock.addResult).toHaveBeenCalled();

      expect(storageServiceMock.exportData).not.toHaveBeenCalled();
    });
  });

  describe('onFailed', () => {
    it('deve salvar um resultado de erro e exportar quando a fila estiver vazia', async () => {
      queueMock.getJob = jest.fn().mockResolvedValue({
        data: {
          url: 'https://produto.com',
        },
      });

      queueMock.getJobCountByTypes = jest.fn().mockResolvedValue(0);

      await listener.onFailed({
        jobId: '10',
        failedReason: 'Timeout',
      });

      expect(storageServiceMock.addResult).toHaveBeenCalledWith({
        title: null,
        normal_price: null,
        discount_price: null,
        product_url: 'https://produto.com',
        image_url: null,
        status: 'error',
        error_message: 'Timeout',
      });

      expect(storageServiceMock.exportData).toHaveBeenCalled();
    });

    it('deve utilizar o jobId quando não encontrar o job', async () => {
      queueMock.getJob = jest.fn().mockResolvedValue(undefined);

      queueMock.getJobCountByTypes = jest.fn().mockResolvedValue(0);

      await listener.onFailed({
        jobId: '25',
        failedReason: 'Erro',
      });

      expect(storageServiceMock.addResult).toHaveBeenCalledWith({
        title: null,
        normal_price: null,
        discount_price: null,
        product_url: 'Job ID: 25',
        image_url: null,
        status: 'error',
        error_message: 'Erro',
      });
    });

    it('não deve exportar enquanto houver jobs pendentes', async () => {
      queueMock.getJob = jest.fn().mockResolvedValue({
        data: {
          url: 'https://produto.com',
        },
      });

      queueMock.getJobCountByTypes = jest.fn().mockResolvedValue(2);

      await listener.onFailed({
        jobId: '30',
        failedReason: 'Erro',
      });

      expect(storageServiceMock.addResult).toHaveBeenCalled();

      expect(storageServiceMock.exportData).not.toHaveBeenCalled();
    });
  });
});
