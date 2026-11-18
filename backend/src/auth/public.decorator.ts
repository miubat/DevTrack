import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

// Marks a route that needs no access token (login, refresh, logout, health check).
export const Public = () => SetMetadata(IS_PUBLIC, true);
