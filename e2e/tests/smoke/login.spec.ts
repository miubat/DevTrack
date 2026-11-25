import { expect, test } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage.ts';
import { NavBar } from '../../pages/NavBar.ts';
import { ADMIN, PASSWORD } from '../../utils/users.ts';

// AGL-33.3: the login smoke test. It runs on every pull request: the e2e job in
// .github/workflows/ci.yml starts PostgreSQL and the backend, so this signs in for real.
// Locally it needs the backend and the database running too.
test('admin signs in, sees the menu and keeps the session after a reload @smoke', async ({
  page,
}) => {
  const login = new LoginPage(page);
  const nav = new NavBar(page);

  await login.goto();
  await login.login(ADMIN.email, PASSWORD);
  await expect(page).toHaveURL(/\/$/);
  await nav.expectMenu(ADMIN.menu);

  // The session is restored from the refresh cookie (AGL-06.2 / AGL-05.2).
  await page.reload();
  await nav.expectMenu(ADMIN.menu);
});
