import { Job } from 'bullmq';
import { ScraperProcessor } from '../scraper.processor';
import { CircuitBreakerService } from '../circuit-breaker.service';
import { JitterDelayService } from '../jitter-delay.service';
import { ForbiddenAccessError, ProductNotFoundError } from '../scraper.errors';
import { ScrapeJobData } from '../scraper.types';

describe('ScraperProcessor', () => {
  let processor: ScraperProcessor;
  let productPageClient: { fetchProduct: jest.Mock };
  let jitterDelay: { wait: jest.Mock };
  let circuitBreaker: { reset: jest.Mock; registerForbidden: jest.Mock };

  const buildJob = (
    url = 'https://www.ifood.com.br/produto',
  ): Job<ScrapeJobData> =>
    ({
      id: '1',
      attemptsMade: 0,
      data: { url, headers: {} },
    }) as unknown as Job<ScrapeJobData>;

  beforeEach(() => {
    productPageClient = {
      fetchProduct: jest.fn(),
    };

    jitterDelay = {
      wait: jest.fn().mockResolvedValue(0),
    };

    circuitBreaker = {
      reset: jest.fn(),
      registerForbidden: jest.fn().mockResolvedValue(undefined),
    };

    processor = new ScraperProcessor(
      productPageClient,
      jitterDelay as unknown as JitterDelayService,
      circuitBreaker as unknown as CircuitBreakerService,
    );
  });

  it('deve retornar o resultado com sucesso e resetar o circuit breaker', async () => {
    productPageClient.fetchProduct.mockResolvedValue({
      item: {
        description: 'Produto teste',
        unitPrice: 19.9,
        logoUrl: 'imagem.jpg',
      },
    });

    const result = await processor.process(buildJob());

    expect(result).toEqual({
      title: 'Produto teste',
      normal_price: 19.9,
      discount_price: null,
      product_url: 'https://www.ifood.com.br/produto',
      image_url:
        'https://static.ifood-static.com.br/image/upload/t_high/pratos/imagem.jpg',
      status: 'success',
      error_message: null,
    });
    expect(circuitBreaker.reset).toHaveBeenCalled();
  });

  it('deve retornar resultado de "nao encontrado" quando nao ha item, resetando o circuit breaker', async () => {
    productPageClient.fetchProduct.mockResolvedValue({ item: null });

    const result = await processor.process(buildJob());

    expect(result.status).toBe('success');
    expect(result.title).toBeNull();
    expect(result.error_message).toBe(
      'produto indisponivel ou pagina nao carregada',
    );
    expect(circuitBreaker.reset).toHaveBeenCalled();
  });

  it('deve tratar ProductNotFoundError retornando resultado de "nao encontrado"', async () => {
    productPageClient.fetchProduct.mockRejectedValue(
      new ProductNotFoundError('https://www.ifood.com.br/produto'),
    );

    const result = await processor.process(buildJob());

    expect(result.status).toBe('success');
    expect(result.error_message).toBe(
      'produto indisponivel ou pagina nao carregada',
    );
    expect(circuitBreaker.reset).toHaveBeenCalled();
    expect(circuitBreaker.registerForbidden).not.toHaveBeenCalled();
  });

  it('deve registrar bloqueio e relançar o erro em caso de ForbiddenAccessError', async () => {
    const url = 'https://www.ifood.com.br/produto';
    productPageClient.fetchProduct.mockRejectedValue(
      new ForbiddenAccessError(url),
    );

    await expect(processor.process(buildJob(url))).rejects.toBeInstanceOf(
      ForbiddenAccessError,
    );
    expect(circuitBreaker.registerForbidden).toHaveBeenCalledWith(url);
    expect(circuitBreaker.reset).not.toHaveBeenCalled();
  });

  it('deve relançar outros erros sem acionar o circuit breaker', async () => {
    const error = new Error('falha inesperada');
    productPageClient.fetchProduct.mockRejectedValue(error);

    await expect(processor.process(buildJob())).rejects.toBe(error);
    expect(circuitBreaker.reset).not.toHaveBeenCalled();
    expect(circuitBreaker.registerForbidden).not.toHaveBeenCalled();
  });

  it('deve aguardar o jitter delay antes de processar', async () => {
    productPageClient.fetchProduct.mockResolvedValue({ item: null });

    await processor.process(buildJob());

    expect(jitterDelay.wait).toHaveBeenCalled();
  });
});
