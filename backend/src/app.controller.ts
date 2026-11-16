// QA check AGL-07.1, do not merge

import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    Promise.resolve();
    return this.appService.getHello();
  }
}
