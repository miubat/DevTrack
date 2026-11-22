import { expect, type Locator, type Page } from '@playwright/test';

// Page object for the top menu (visible on every page).
export class NavBar {
  readonly nav: Locator;
  readonly signInLink: Locator;

  constructor(page: Page) {
    this.nav = page.getByRole('navigation', { name: 'Main' });
    this.signInLink = page.getByRole('link', { name: 'Sign in', exact: true });
  }

  // The signed-in user sees exactly these menu links, in this order.
  async expectMenu(labels: string[]) {
    await expect(this.nav.getByRole('link')).toHaveText(labels);
  }

  async expectSignedOut() {
    await expect(this.nav).toHaveCount(0);
    await expect(this.signInLink).toBeVisible();
  }

  async open(label: string) {
    await this.nav.getByRole('link', { name: label, exact: true }).click();
  }
}
