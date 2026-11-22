import { expect, type Locator, type Page } from '@playwright/test';

// Page object for /no-access (wrong role).
export class NoAccessPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly homeLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: 'No access' });
    this.homeLink = page.getByRole('link', { name: 'Go to home' });
  }

  async expectVisible() {
    await expect(this.page).toHaveURL(/\/no-access$/);
    await expect(this.heading).toBeVisible();
  }
}
