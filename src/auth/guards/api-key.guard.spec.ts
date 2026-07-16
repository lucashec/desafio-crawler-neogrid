import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  const originalEnv = process.env.X_API_KEY;

  const buildContext = (apiKey?: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { x_api_key: apiKey },
        }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    guard = new ApiKeyGuard();
    process.env.X_API_KEY = 'chave-secreta';
  });

  afterEach(() => {
    process.env.X_API_KEY = originalEnv;
  });

  it('deve permitir o acesso quando a api key é válida', () => {
    expect(guard.canActivate(buildContext('chave-secreta'))).toBe(true);
  });

  it('deve lançar UnauthorizedException quando a api key é inválida', () => {
    expect(() => guard.canActivate(buildContext('chave-errada'))).toThrow(
      UnauthorizedException,
    );
  });

  it('deve lançar UnauthorizedException quando a api key não é informada', () => {
    expect(() => guard.canActivate(buildContext(undefined))).toThrow(
      UnauthorizedException,
    );
  });
});
