import { expect, test } from '@playwright/test';

// AGL-33.1: proves the framework runs against the app.

test('home page shows the DevTrack heading @smoke', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: 'DevTrack' }),
  ).toBeVisible();
});

test('unknown page shows "Page not found" with a link home @smoke', async ({
  page,
}) => {
  await page.goto('/this-page-does-not-exist');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Page not found' }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Go to home' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'DevTrack' }),
  ).toBeVisible();
});
