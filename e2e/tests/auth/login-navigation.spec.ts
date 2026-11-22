import { expect, test } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage.ts';
import { NavBar } from '../../pages/NavBar.ts';
import { NoAccessPage } from '../../pages/NoAccessPage.ts';
import { ADMIN, ALL_USERS, PASSWORD, TEAM_MEMBER } from '../../utils/users.ts';

// AGL-33.2: tests that use the page objects for login and navigation.
// Sign-in tests need the backend and the database. CI does not start them yet:
// set E2E_BACKEND=true to run them there too.
const needsBackend = !!process.env.CI && !process.env.E2E_BACKEND;

test.describe('login form validation', () => {
  test('empty form shows both field errors @auth', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.submit.click();
    await login.expectFieldError('Email is required.');
    await login.expectFieldError('Password is required.');
  });

  test('invalid email shows an email error @auth', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login('not-an-email', 'something');
    await login.expectFieldError('Enter a valid email address.');
  });
});

test.describe('sign in and navigation (needs the backend)', () => {
  test.skip(needsBackend, 'needs the backend and the database');

  test('wrong password shows an error and clears the password @auth', async ({
    page,
  }) => {
    const login = new LoginPage(page);
    await login.goto();
    // A made-up email, so no seed account gets close to the 5-failure lockout.
    await login.login(`nobody-${Date.now()}@devtrack.local`, 'wrong-password');
    await login.expectServerError();
    // The generic message means the server was not reached, so it must not appear here.
    await expect(login.serverError).not.toContainText('Something went wrong');
    await expect(login.password).toHaveValue('');
    await expect(page).toHaveURL(/\/login$/);
  });

  for (const user of ALL_USERS) {
    test(`${user.label} signs in and sees the right menu @nav`, async ({
      page,
    }) => {
      const login = new LoginPage(page);
      const nav = new NavBar(page);
      await login.goto();
      await login.login(user.email, PASSWORD);
      await expect(page).toHaveURL(/\/$/);
      await nav.expectMenu(user.menu);
    });
  }

  test('admin can open the Users page @nav', async ({ page }) => {
    const login = new LoginPage(page);
    const nav = new NavBar(page);
    await login.goto();
    await login.login(ADMIN.email, PASSWORD);
    await nav.open('Users');
    await expect(page).toHaveURL(/\/admin\/users$/);
  });

  test('team member opening /admin/users gets the no-access page @nav', async ({
    page,
  }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(TEAM_MEMBER.email, PASSWORD);
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/admin/users');
    await new NoAccessPage(page).expectVisible();
  });

  test('signed-out visitor opening /admin/users is sent to the login page @auth', async ({
    page,
  }) => {
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/login$/);
    await new NavBar(page).expectSignedOut();
  });
});
