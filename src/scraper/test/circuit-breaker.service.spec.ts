import { CircuitBreakerService } from '../circuit-breaker.service';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;
  let queue: {
    isPaused: jest.Mock;
    pause: jest.Mock;
  };

  beforeEach(() => {
    queue = {
      isPaused: jest.fn().mockResolvedValue(false),
      pause: jest.fn().mockResolvedValue(undefined),
    };
    service = new CircuitBreakerService(queue as never);
  });

  it('não deve pausar a fila antes de atingir o limite de 403 consecutivos', async () => {
    for (let i = 0; i < 4; i++) {
      await service.registerForbidden('https://www.ifood.com.br/produto');
    }

    expect(queue.pause).not.toHaveBeenCalled();
  });

  it('deve pausar a fila ao atingir 5 respostas 403 consecutivas', async () => {
    for (let i = 0; i < 5; i++) {
      await service.registerForbidden('https://www.ifood.com.br/produto');
    }

    expect(queue.pause).toHaveBeenCalledTimes(1);
  });

  it('não deve pausar novamente se a fila já estiver pausada', async () => {
    queue.isPaused.mockResolvedValue(true);

    for (let i = 0; i < 5; i++) {
      await service.registerForbidden('https://www.ifood.com.br/produto');
    }

    expect(queue.pause).not.toHaveBeenCalled();
  });

  it('reset deve zerar o contador de 403 consecutivos', async () => {
    for (let i = 0; i < 4; i++) {
      await service.registerForbidden('https://www.ifood.com.br/produto');
    }

    service.reset();

    for (let i = 0; i < 4; i++) {
      await service.registerForbidden('https://www.ifood.com.br/produto');
    }

    expect(queue.pause).not.toHaveBeenCalled();
  });
});
