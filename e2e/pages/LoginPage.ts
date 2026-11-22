import { expect, type Locator, type Page } from '@playwright/test';

// Page object for /login. Tests call these methods instead of repeating selectors.
export class LoginPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly serverError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', {
      level: 1,
      name: 'Sign in to DevTrack',
    });
    this.email = page.getByLabel('Email');
    this.password = page.getByLabel('Password');
    this.submit = page.getByRole('button', { name: 'Sign in', exact: true });
    this.serverError = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/login');
    await expect(this.heading).toBeVisible();
  }

  async login(email: string, password: string) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }

  async expectFieldError(text: string) {
    await expect(this.page.getByText(text, { exact: true })).toBeVisible();
  }

  async expectServerError() {
    await expect(this.serverError).toBeVisible();
  }
}
