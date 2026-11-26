import { INestApplication } from '@nestjs/common';
import { DatabaseService } from '../../src/database/database.service.js';

// Direct database access for test setup and clean-up.
export function testDb(app: INestApplication): DatabaseService {
  return app.get(DatabaseService);
}

// Failed logins can lock a seed user (5 in 15 minutes) and break other tests.
// Call this in afterAll of any file that sends wrong passwords.
export async function clearFailedLogins(app: INestApplication): Promise<void> {
  await testDb(app).query('DELETE FROM failed_logins');
}

// Turns a user on or off (users.is_active).
export async function setUserActive(
  app: INestApplication,
  email: string,
  active: boolean,
): Promise<void> {
  await testDb(app).query(
    'UPDATE users SET is_active = $1 WHERE lower(email) = lower($2)',
    [active, email],
  );
}
