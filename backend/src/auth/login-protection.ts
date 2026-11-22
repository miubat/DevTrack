import {
  applyDecorators,
  ArgumentsHost,
  CanActivate,
  Catch,
  ExceptionFilter,
  ExecutionContext,
  HttpException,
  Injectable,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { LoginLockedError } from './auth.service.js';
import { LoginRateLimiter } from './login-rate-limiter.js';

// 10 login requests per minute per IP (NFR-SEC-07): 429 RATE_LIMITED.
@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  constructor(private readonly limiter: LoginRateLimiter) {}

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const wait = this.limiter.check(req.ip ?? 'unknown');
    if (wait > 0) {
      http.getResponse<Response>().setHeader('Retry-After', String(wait));
      throw new HttpException(
        {
          statusCode: 429,
          code: 'RATE_LIMITED',
          message: 'Too many login attempts. Try again later.',
        },
        429,
      );
    }
    return true;
  }
}

// 5 failed logins in 15 minutes (FR-AUTH-04): 429 TEMPORARILY_LOCKED + Retry-After.
@Catch(LoginLockedError)
export class LoginLockedFilter implements ExceptionFilter {
  catch(error: LoginLockedError, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    res.setHeader('Retry-After', String(error.retryAfterSeconds));
    res.status(429).json({
      statusCode: 429,
      code: 'TEMPORARILY_LOCKED',
      message: 'Too many failed logins. Try again later.',
    });
  }
}

export const LoginProtection = () =>
  applyDecorators(
    UseGuards(LoginRateLimitGuard),
    UseFilters(LoginLockedFilter),
  );
