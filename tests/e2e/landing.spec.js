import { expect, test } from '@playwright/test';

test('new visitor sees the product preview and the create flow', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Feel closer, even from miles away/i })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Chat sample' })).toBeVisible();
  await page.getByRole('link', { name: /Create our space/i }).first().click();
  await expect(page).toHaveURL(/\/login\?mode=signup/);
  await expect(page.getByRole('heading', { name: /Create your little universe/i })).toBeVisible();
  await expect(page.getByLabel('Couple code (optional)')).toBeVisible();
});

test('public sample features are interactive and use fictional data', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Night Sky' }).click();
  await expect(page.getByText('8 little moments in this sample sky')).toBeVisible();
  await page.getByRole('button', { name: '+ Add a star' }).click();
  await expect(page.getByText('9 little moments in this sample sky')).toBeVisible();

  await page.getByRole('button', { name: 'Letters' }).click();
  await page.getByRole('button', { name: 'Open sample letter' }).click();
  await expect(page.getByText(/Here is a small reminder/)).toBeVisible();

  await page.getByRole('button', { name: 'Together', exact: true }).click();
  await page.getByRole('button', { name: 'Try demo' }).click();
  await expect(page.getByText('Sample session started')).toBeVisible();
});

test('mobile hero remains readable without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Create our space' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Chat' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('existing users can follow the join-code flow directly', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Join with a code' }).click();
  await expect(page).toHaveURL(/\/login\?mode=login/);
  await expect(page.getByLabel('Couple code', { exact: true })).toBeVisible();
});
