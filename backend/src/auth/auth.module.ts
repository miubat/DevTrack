import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AccessCheckController } from './access-check.controller.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { LoginRateLimiter } from './login-rate-limiter.js';
import { RolesGuard } from './roles.guard.js';
import { SessionService } from './session.service.js';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController, AccessCheckController],
  providers: [
    AuthService,
    SessionService,
    LoginRateLimiter,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
