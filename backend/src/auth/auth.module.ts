import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AccessCheckController } from './access-check.controller.js';
import { AccountGuard } from './account.guard.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { LoginRateLimiter } from './login-rate-limiter.js';
import { MeController } from './me.controller.js';
import { RolesGuard } from './roles.guard.js';
import { SessionService } from './session.service.js';
import { ValidationCodeFilter } from './validation-code.filter.js';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController, AccessCheckController, MeController],
  providers: [
    AuthService,
    SessionService,
    LoginRateLimiter,
    // Global guards run in this order: who you are, then the account state
    // (open session, current name, first-login password change, AGL-08.4),
    // then your role.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: AccountGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: ValidationCodeFilter },
  ],
})
export class AuthModule {}
