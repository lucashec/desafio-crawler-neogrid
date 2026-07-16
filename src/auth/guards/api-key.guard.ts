import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x_api_key'];

    if (apiKey !== process.env.X_API_KEY) {
      throw new UnauthorizedException('API Key inválida');
    }

    return true;
  }
}
