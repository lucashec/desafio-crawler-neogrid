import { JitterDelayService } from '../jitter-delay.service';

describe('JitterDelayService', () => {
  let service: JitterDelayService;

  beforeEach(() => {
    service = new JitterDelayService();
  });

  it('deve gerar um delay dentro da janela de jitter (500ms a 4000ms)', () => {
    for (let i = 0; i < 50; i++) {
      const delay = service.getDelayMs();
      expect(delay).toBeGreaterThanOrEqual(500);
      expect(delay).toBeLessThanOrEqual(4000);
    }
  });

  it('wait deve aguardar e retornar o delay gerado', async () => {
    jest.useFakeTimers();
    jest.spyOn(service, 'getDelayMs').mockReturnValue(1000);

    const promise = service.wait();
    jest.advanceTimersByTime(1000);
    const delay = await promise;

    expect(delay).toBe(1000);
    jest.useRealTimers();
  });
});
