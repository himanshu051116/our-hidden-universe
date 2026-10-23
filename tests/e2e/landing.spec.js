import { expect, test } from '@playwright/test';

test('new visitor sees the functional preview and create flow', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Feel closer, even from miles away/i })).toBeVisible();
  await expect(page.getByRole('tabpanel', { name: 'Chat' })).toBeVisible();
  await expect(page.getByLabel('Type a sample message')).toBeEditable();
  await page.getByRole('link', { name: /Create our space/i }).first().click();
  await expect(page).toHaveURL(/\/login\?mode=signup/);
  await expect(page.getByRole('heading', { name: /Create your little universe/i })).toBeVisible();
  await expect(page.getByText('Customize your couple code (optional)')).toBeVisible();
  await page.getByText('Customize your couple code (optional)').click();
  await expect(page.getByLabel('Couple code (optional)')).toBeVisible();
});

test('chat sends a sample message, responds and survives switching tabs', async ({ page }) => {
  await page.goto('/');
  const input = page.getByLabel('Type a sample message');
  await input.fill('Meet me under the stars');
  await input.press('Enter');
  const conversation = page.getByRole('log', { name: 'Sample chat messages' });
  await expect(conversation.getByText('Meet me under the stars')).toBeVisible();
  await expect(conversation.getByText('You just made me smile. ✨')).toBeVisible();
  await expect(input).toBeEmpty();
  await page.getByRole('tab', { name: 'Night Sky' }).click();
  await page.getByRole('tab', { name: 'Chat' }).click();
  await expect(conversation.getByText('Meet me under the stars')).toBeVisible();
  await page.getByRole('button', { name: 'Reset sample chat' }).click();
  await expect(conversation.getByText('Meet me under the stars')).toHaveCount(0);
});

test('night sky adds and opens named stars, supports reset', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Night Sky' }).click();
  await expect(page.getByText('3 sample stars. Tap a star to read its memory.')).toBeVisible();
  await page.getByLabel('Name a sample memory').fill('Our first movie night');
  await page.getByRole('button', { name: 'Add star' }).click();
  await expect(page.getByText('Our first movie night')).toBeVisible();
  await expect(page.getByText('4 sample stars. Tap a star to read its memory.')).toBeVisible();
  await page.getByRole('button', { name: 'Open star: Our first hello' }).click();
  await expect(page.getByText('Our first hello')).toBeVisible();
  await page.getByRole('button', { name: 'Reset sample sky' }).click();
  await expect(page.getByText('3 sample stars. Tap a star to read its memory.')).toBeVisible();
});

test('letters open and close, and switching letter resets the envelope', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Letters' }).click();
  await page.getByRole('button', { name: 'Open letter', exact: true }).click();
  await expect(page.getByText('The distance is only temporary.')).toBeVisible();
  await page.getByRole('button', { name: 'You had a hard day' }).click();
  await expect(page.getByText('You did enough today.')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open letter', exact: true }).click();
  await expect(page.getByText('You did enough today.')).toBeVisible();
  await page.getByRole('button', { name: 'Close letter' }).click();
  await expect(page.getByText('You did enough today.')).toHaveCount(0);
});

test('together preview advances two timelines in sync; pause, resume and reset work', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('tab', { name: 'Together' }).click();
  await expect(page.getByRole('button', { name: 'Start together' })).toBeDisabled();
  await page.getByRole('button', { name: 'Mark you ready' }).click();
  await expect(page.getByRole('button', { name: 'Start together' })).toBeDisabled();
  await page.getByRole('button', { name: 'Mark partner ready' }).click();
  await expect(page.getByRole('button', { name: 'Start together' })).toBeEnabled();
  await page.getByRole('button', { name: 'Start together' }).click();
  await expect(page.getByText('Starting together in 3')).toBeVisible();
  await page.clock.runFor(3100);
  await page.clock.runFor(3200);
  await expect(page.getByRole('progressbar', { name: 'You sample playback progress' })).toHaveAttribute('aria-valuenow', '3');
  await expect(page.getByRole('progressbar', { name: 'Partner sample playback progress' })).toHaveAttribute('aria-valuenow', '3');
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.clock.runFor(2300);
  await expect(page.getByRole('progressbar', { name: 'You sample playback progress' })).toHaveAttribute('aria-valuenow', '3');
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.clock.runFor(1100);
  await expect(page.getByRole('progressbar', { name: 'Partner sample playback progress' })).toHaveAttribute('aria-valuenow', '4');
  await page.getByRole('tab', { name: 'Chat' }).click();
  await page.getByRole('tab', { name: 'Together' }).click();
  await expect(page.getByText('Both timelines paused')).toBeVisible();
  await page.getByRole('button', { name: 'Restart sample playback' }).click();
  await expect(page.getByRole('progressbar', { name: 'You sample playback progress' })).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByRole('button', { name: 'Start together' })).toBeDisabled();
});

test('mobile experience is interactive and has no horizontal overflow or wrapped primary CTA', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const create = page.getByRole('link', { name: 'Create our space' }).first();
  await expect(create).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explore the interactive chat, Night Sky, letters and movie preview' })).toBeVisible();
  await page.getByRole('link', { name: 'Preview', exact: true }).click();
  await expect(page).toHaveURL(/#preview$/);
  await expect(page.getByRole('tab', { name: 'Chat' })).toBeVisible();
  await page.getByLabel('Type a sample message').fill('A mobile message');
  await page.getByRole('button', { name: 'Send sample message' }).click();
  await expect(page.getByRole('log').getByText('A mobile message')).toBeVisible();
  const isWrapped = await create.evaluate((element) => {
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

test('join-code path remains available', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Join with a code' }).click();
  await expect(page).toHaveURL(/\/login\?mode=login/);
  await expect(page.getByLabel('Couple code', { exact: true })).toBeVisible();
});

test('demo supports tab keyboard navigation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Chat' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Night Sky' })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Together' })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Home');
  await expect(page.getByRole('tab', { name: 'Chat' })).toHaveAttribute('aria-selected', 'true');
});

test('capture settled desktop, mobile and interaction screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.waitForTimeout(550);
  await page.screenshot({ path: 'test-results/landing-desktop-first-fold.png' });
  await page.screenshot({ path: 'test-results/landing-desktop-full.png', fullPage: true });
  await page.getByRole('tab', { name: 'Night Sky' }).click();
  await page.getByLabel('Name a sample memory').fill('Movie night');
  await page.getByRole('button', { name: 'Add star' }).click();
  await page.screenshot({ path: 'test-results/landing-demo-sky.png' });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.waitForTimeout(550);
  await page.screenshot({ path: 'test-results/landing-mobile-first-fold.png' });
  await page.screenshot({ path: 'test-results/landing-mobile-full.png', fullPage: true });
  await page.getByRole('link', { name: 'Preview', exact: true }).click();
  await page.getByRole('tab', { name: 'Letters' }).click();
  await page.getByRole('button', { name: 'Open letter' }).click();
  const sampleLetterIsUnclipped = await page.getByText('Look up tonight.', { exact: false }).evaluate((paragraph) => {
    const scroller = paragraph.parentElement?.parentElement;
    const p = paragraph.getBoundingClientRect();
    const box = scroller?.getBoundingClientRect();
    return Boolean(box && p.top >= box.top && p.bottom <= box.bottom - 2);
  });
  expect(sampleLetterIsUnclipped).toBe(true);
  await page.screenshot({ path: 'test-results/landing-demo-mobile-letter.png' });
});

test('guest entry avoids the calling runtime and excess ambient effects', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Feel closer, even from miles away/i })).toBeVisible();
  const guestMetrics = await page.evaluate(() => ({
    starCount: document.querySelectorAll('.ambient-star').length,
    callRuntimeDownloaded: performance.getEntriesByType('resource')
      .some((resource) => /CallRuntime-|WatchCallPanel-|CallScreen-/.test(resource.name)),
    opacity: Number(getComputedStyle(document.querySelector('.cinematic-bg')).opacity),
  }));
  expect(guestMetrics.starCount).toBeLessThanOrEqual(14);
  expect(guestMetrics.callRuntimeDownloaded).toBe(false);
  expect(guestMetrics.opacity).toBeGreaterThan(0.95);
  await page.goto('/login?mode=login');
  await expect(page.getByLabel('Couple code', { exact: true })).toBeVisible();
});

test('malformed link fragments do not crash the landing route', async ({ page }) => {
  const crashes = [];
  page.on('pageerror', (error) => crashes.push(error.message));
  await page.goto('/#%');
  await expect(page.getByRole('heading', { name: /Feel closer, even from miles away/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Chat' })).toBeVisible();
  expect(crashes).toEqual([]);
});
