import cookieParser from 'cookie-parser';
import { INestApplication, ValidationPipe } from '@nestjs/common';

// App-wide settings. Used by main.ts and by the API tests,
// so the tests run the app exactly like the real server.
export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.use(cookieParser());
}
