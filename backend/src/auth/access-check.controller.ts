import { Controller, Get } from '@nestjs/common';
import { Roles } from './roles.decorator.js';

// Temporary routes so the guards can be tested through the API.
// Remove them when real routes with roles exist.
@Controller('access-check')
export class AccessCheckController {
  @Get('any')
  any() {
    return { ok: true };
  }

  @Get('admin')
  @Roles('ADMIN')
  admin() {
    return { ok: true };
  }

  @Get('manager')
  @Roles('ADMIN', 'PROJECT_MANAGER')
  manager() {
    return { ok: true };
  }
}
