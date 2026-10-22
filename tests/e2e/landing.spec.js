import { expect, test } from '@playwright/test';

test('new visitor sees the product preview and the create flow', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Feel closer, even from miles away/i })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Chat sample' })).toBeVisible();
  await page.getByRole('link', { name: /Create our space/i }).first().click();
  await expect(page).toHaveURL(/\/login\?mode=signup/);
  await expect(page.getByRole('heading', { name: /Create your little universe/i })).toBeVisible();
  await expect(page.getByText('Customize your couple code (optional)')).toBeVisible();
  await page.getByText('Customize your couple code (optional)').click();
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
  await expect(page.getByRole('link', { name: 'Explore the interactive chat, Night Sky, letters and movie preview' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Chat' })).toBeVisible();
  const createButton = page.getByRole('link', { name: 'Create our space' }).first();
  const isWrapped = await createButton.evaluate((element) => {
    const textNode = [...element.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    if (!textNode) return false;
    const range = document.createRange();
    range.selectNodeContents(textNode);
    return range.getClientRects().length > 1;
  });
  expect(isWrapped).toBe(false);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('existing users can follow the join-code flow directly', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Join with a code' }).click();
  await expect(page).toHaveURL(/\/login\?mode=login/);
  await expect(page.getByLabel('Couple code', { exact: true })).toBeVisible();
});


test('capture first-visit desktop and mobile layout screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Chat sample' })).toBeVisible();
  await page.waitForTimeout(750);
  await page.screenshot({ path: 'test-results/landing-desktop-first-fold.png' });
  await page.screenshot({ path: 'test-results/landing-desktop-full.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Feel closer, even from miles away/i })).toBeVisible();
  await page.waitForTimeout(750);
  await page.screenshot({ path: 'test-results/landing-mobile-first-fold.png' });
  await page.screenshot({ path: 'test-results/landing-mobile-full.png', fullPage: true });
});
