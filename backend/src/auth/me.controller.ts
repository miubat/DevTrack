import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import type { AuthUser } from './jwt-auth.guard.js';
import { AllowDuringPasswordChange } from './account.guard.js';
import { setRefreshCookie } from './refresh-cookie.js';
import { Roles } from './roles.decorator.js';
import { SessionService } from './session.service.js';

@Controller('me')
export class MeController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

  // SRS 5.3: POST /me/password. AGL-08.4 uses it at first login to replace the
  // temporary password. Every session of the user ends at once, so anyone else
  // who knew the old password is signed out (their access tokens are refused
  // from the next request). This device gets a new session.
  @Post('password')
  @HttpCode(200)
  @Roles('ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER')
  @AllowDuringPasswordChange()
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: Request & { user: AuthUser },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.changePassword(
      req.user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    await this.sessions.revokeAll(req.user.id);
    const tokens = await this.sessions.start(req.user.id);
    setRefreshCookie(res, tokens);
    return { accessToken: tokens.accessToken };
  }
}
