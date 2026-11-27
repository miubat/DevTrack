import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { Public } from './public.decorator.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { Roles } from './roles.decorator.js';
import { LoginProtection } from './login-protection.js';
import { SessionService } from './session.service.js';
import { REFRESH_COOKIE, setRefreshCookie } from './refresh-cookie.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

  @Public()
  @Post('login')
  @LoginProtection()
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.auth.login(dto.email, dto.password);
    const tokens = await this.sessions.start(user.id);
    setRefreshCookie(res, tokens);
    return { user, accessToken: tokens.accessToken };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'UNAUTHENTICATED',
        message: 'Invalid refresh token',
        error: 'Unauthorized',
      });
    }
    const tokens = await this.sessions.refresh(token);
    setRefreshCookie(res, tokens);
    return { accessToken: tokens.accessToken };
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (token) {
      await this.sessions.logout(token);
    }
    res.clearCookie(REFRESH_COOKIE, { path: '/auth' });
  }

  // Test route for the guard. The profile task (GET /me) can replace it later.
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER')
  me(@Req() req: Request & { user?: { id: string; role: string } }) {
    return req.user;
  }
}
