import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator.js';
import { AdminUsersService } from './admin-users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { ListUsersDto } from './dto/list-users.dto.js';

// User administration (FR-AUTH-02, SRS 5.3). Admin only: other roles get 403 FORBIDDEN_ROLE.
@Controller('admin/users')
@Roles('ADMIN')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  // transform: turns page and size from text into numbers and fills the defaults.
  @Get()
  list(
    @Query(new ValidationPipe({ whitelist: true, transform: true }))
    query: ListUsersDto,
  ) {
    return this.users.list(query);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }
}
