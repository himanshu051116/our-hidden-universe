import { expect, test } from '@playwright/test';

const required = [
  'OHS_TEST_USER_A_EMAIL',
  'OHS_TEST_USER_A_PASSWORD',
  'OHS_TEST_USER_B_EMAIL',
  'OHS_TEST_USER_B_PASSWORD',
  'OHS_TEST_COUPLE_CODE',
];

function missingTestEnvironment() {
  return required.filter((key) => !process.env[key]);
}

async function login(page, email, password, coupleCode) {
  await page.goto('/login');
  // Login defaults to Join universe; avoid the duplicate mode/submit label.
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByLabel('Couple code').fill(coupleCode);
  await page.getByRole('button', { name: 'Join universe', exact: true }).last().click();
  await expect(page).toHaveURL(/\/universe(?:\/home)?(?:\/)?(?:\?.*)?$/);
}

test.describe('OHS 1:1 call smoke', () => {
  test.beforeEach(() => {
    const missing = missingTestEnvironment();
    test.skip(
      missing.length > 0,
      `Missing E2E environment variables: ${missing.join(', ')}`,
    );
  });

  test('two authenticated members can connect a video call', async ({ browser }) => {
    const callerContext = await browser.newContext({
      permissions: ['camera', 'microphone'],
    });
    const calleeContext = await browser.newContext({
      permissions: ['camera', 'microphone'],
    });

    const caller = await callerContext.newPage();
    const callee = await calleeContext.newPage();

    try {
      await Promise.all([
        login(
          caller,
          process.env.OHS_TEST_USER_A_EMAIL,
          process.env.OHS_TEST_USER_A_PASSWORD,
          process.env.OHS_TEST_COUPLE_CODE,
        ),
        login(
          callee,
          process.env.OHS_TEST_USER_B_EMAIL,
          process.env.OHS_TEST_USER_B_PASSWORD,
          process.env.OHS_TEST_COUPLE_CODE,
        ),
      ]);

      await Promise.all([
        caller.goto('/universe/chat?diagnostics=1'),
        callee.goto('/universe/chat?diagnostics=1'),
      ]);

      await expect(caller.getByRole('button', { name: 'Start video call' })).toBeEnabled();
      await caller.getByRole('button', { name: 'Start video call' }).click();

      await expect(callee.getByRole('dialog')).toBeVisible();

      await callee.getByRole('button', { name: 'Answer' }).click();

      // Seeing an End call button is insufficient: it is visible while "Connecting".
      await expect(caller.locator('[data-call-status="connected"]')).toBeVisible({ timeout: 40_000 });
      await expect(callee.locator('[data-call-status="connected"]')).toBeVisible({ timeout: 40_000 });

      // Confirm partner video tracks actually arrive, not just Firestore call status.
      await expect.poll(() => callee.evaluate(() => Array.from(document.querySelectorAll('video'))
        .some((element) => !element.muted && element.srcObject?.getVideoTracks()
          .some((track) => track.readyState === 'live'))), { timeout: 15000 }).toBe(true);
      await expect.poll(() => caller.evaluate(() => Array.from(document.querySelectorAll('video'))
        .some((element) => !element.muted && element.srcObject?.getVideoTracks()
          .some((track) => track.readyState === 'live'))), { timeout: 15000 }).toBe(true);

      await caller.getByRole('button', { name: 'End call' }).click();

      await expect(caller.getByRole('button', { name: 'Start video call' })).toBeEnabled({
        timeout: 10_000,
      });
    } finally {
      await callerContext.close();
      await calleeContext.close();
    }
  });

  test('callee can decline and caller returns to idle', async ({ browser }) => {
    const callerContext = await browser.newContext({
      permissions: ['camera', 'microphone'],
    });
    const calleeContext = await browser.newContext({
      permissions: ['camera', 'microphone'],
    });

    const caller = await callerContext.newPage();
    const callee = await calleeContext.newPage();

    try {
      await Promise.all([
        login(
          caller,
          process.env.OHS_TEST_USER_A_EMAIL,
          process.env.OHS_TEST_USER_A_PASSWORD,
          process.env.OHS_TEST_COUPLE_CODE,
        ),
        login(
          callee,
          process.env.OHS_TEST_USER_B_EMAIL,
          process.env.OHS_TEST_USER_B_PASSWORD,
          process.env.OHS_TEST_COUPLE_CODE,
        ),
      ]);

      await Promise.all([
        caller.goto('/universe/chat'),
        callee.goto('/universe/chat'),
      ]);

      await caller.getByRole('button', { name: 'Start video call' }).click();
      await expect(callee.getByRole('dialog')).toBeVisible();

      await callee.getByRole('button', { name: 'Decline' }).click();

      await expect(caller.getByRole('button', { name: 'Start video call' })).toBeEnabled({
        timeout: 10_000,
      });
    } finally {
      await callerContext.close();
      await calleeContext.close();
    }
  });
  test('two authenticated members connect audio with a live remote track', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext({ permissions: ['microphone', 'camera'] }),
      browser.newContext({ permissions: ['microphone', 'camera'] }),
    ]);
    const [caller, callee] = await Promise.all(contexts.map((context) => context.newPage()));
    try {
      await Promise.all([
        login(caller, process.env.OHS_TEST_USER_A_EMAIL, process.env.OHS_TEST_USER_A_PASSWORD, process.env.OHS_TEST_COUPLE_CODE),
        login(callee, process.env.OHS_TEST_USER_B_EMAIL, process.env.OHS_TEST_USER_B_PASSWORD, process.env.OHS_TEST_COUPLE_CODE),
      ]);
      await Promise.all([caller.goto('/universe/chat'), callee.goto('/universe/chat')]);
      await caller.getByRole('button', { name: 'Start audio call' }).click();
      await expect(callee.getByRole('dialog')).toBeVisible({ timeout: 15000 });
      await callee.getByRole('button', { name: 'Answer' }).click();
      await expect(caller.locator('[data-call-status="connected"]')).toBeVisible({ timeout: 40000 });
      await expect(callee.locator('[data-call-status="connected"]')).toBeVisible({ timeout: 40000 });
      for (const page of [caller, callee]) {
        await expect.poll(() => page.evaluate(() => {
          const element = document.querySelector('audio[aria-label="Partner audio"]');
          return Boolean(element?.srcObject?.getAudioTracks().some((track) => track.readyState === 'live'));
        }), { timeout: 15000 }).toBe(true);
      }
      await caller.getByRole('button', { name: 'End call' }).click();
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  });

  test('video call stays visible beside Watch Together and survives switching layouts', async ({ browser }) => {
    const callerContext = await browser.newContext({ permissions: ['camera', 'microphone'] });
    const calleeContext = await browser.newContext({ permissions: ['camera', 'microphone'] });
    const caller = await callerContext.newPage();
    const callee = await calleeContext.newPage();

    try {
      await Promise.all([
        login(caller, process.env.OHS_TEST_USER_A_EMAIL, process.env.OHS_TEST_USER_A_PASSWORD, process.env.OHS_TEST_COUPLE_CODE),
        login(callee, process.env.OHS_TEST_USER_B_EMAIL, process.env.OHS_TEST_USER_B_PASSWORD, process.env.OHS_TEST_COUPLE_CODE),
      ]);
      await Promise.all([
        caller.goto('/universe/together/watch'),
        callee.goto('/universe/together/watch'),
      ]);

      const callerPanel = caller.getByRole('complementary', { name: 'Watch Together video call' });
      const calleePanel = callee.getByRole('complementary', { name: 'Watch Together video call' });
      await expect(callerPanel.getByRole('button', { name: 'Video call' })).toBeEnabled();
      await callerPanel.getByRole('button', { name: 'Video call' }).click();
      await expect(callee.getByRole('dialog')).toBeVisible({ timeout: 20_000 });
      await callee.getByRole('button', { name: 'Answer' }).click();

      await expect(caller.locator('[data-watch-call-status="connected"]')).toBeVisible({ timeout: 40_000 });
      await expect(callee.locator('[data-watch-call-status="connected"]')).toBeVisible({ timeout: 40_000 });
      await expect(caller.locator('[data-call-status="connected"]')).toHaveCount(0);
      await expect(caller.getByRole('heading', { name: /One movie. Two screens. One call/i })).toBeVisible();

      for (const page of [caller, callee]) {
        await expect.poll(() => page.evaluate(() => {
          const streamElement = document.querySelector('video[aria-label="Partner video"]');
          return !!streamElement?.srcObject?.getVideoTracks()
            .some((track) => track.readyState === 'live');
        }), { timeout: 15_000 }).toBe(true);
      }

      // Small-screen calls float above the movie instead of pushing it offscreen.
      await caller.setViewportSize({ width: 390, height: 844 });
      await expect.poll(() => callerPanel.evaluate((el) => getComputedStyle(el).position)).toBe('fixed');
      await expect.poll(() => callerPanel.evaluate((el) => el.parentElement === document.body)).toBe(true);
      const topBeforeScroll = (await callerPanel.boundingBox())?.y;
      await caller.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const topAfterScroll = (await callerPanel.boundingBox())?.y;
      expect(Math.abs(topBeforeScroll - topAfterScroll)).toBeLessThan(4);
      const beforeMove = await callerPanel.boundingBox();
      await callerPanel.getByRole('button', { name: 'Move floating call to other side' }).click();
      const afterMove = await callerPanel.boundingBox();
      expect(beforeMove && afterMove && Math.abs(beforeMove.x - afterMove.x) > 40).toBeTruthy();
      await callerPanel.getByRole('button', { name: 'Compact' }).click();
      await expect(callerPanel.locator('video[aria-label="Partner video"]')).toBeVisible();
      await callerPanel.getByRole('button', { name: 'Expand' }).click();
      await caller.setViewportSize({ width: 1280, height: 800 });

      await callerPanel.getByRole('button', { name: 'Mute microphone' }).click();
      await expect(callerPanel.getByRole('button', { name: 'Unmute microphone' })).toBeVisible();
      await callerPanel.getByRole('button', { name: 'Turn camera off' }).click();
      await expect(callerPanel.getByRole('button', { name: 'Turn camera on' })).toBeVisible();
      // Switching while muted must not re-enable the camera.
      await callerPanel.getByRole('button', { name: 'Switch camera' }).click();
      await expect(callerPanel.getByRole('button', { name: 'Turn camera on' })).toBeVisible();
      await callerPanel.getByRole('button', { name: 'Turn camera on' }).click();

      // Browser support varies, so either an effective saver or a clear
      // browser-unsupported error is acceptable, never silent success.
      await callerPanel.getByRole('button', { name: 'Save video data' }).click();
      const enabled = callerPanel.getByRole('button', { name: /Data saver on/ });
      await expect.poll(async () => (
        await enabled.count() > 0 || await callerPanel.getByRole('alert').count() > 0
      )).toBe(true);
      if (await enabled.count()) {
        await enabled.click();
        await expect(callerPanel.getByRole('button', { name: 'Save video data' })).toBeVisible();
      }

      // The global call provider remains alive across route transitions.
      await callerPanel.getByRole('button', { name: 'Full-screen call' }).click();
      await expect(caller).toHaveURL(/\/universe\/chat$/);
      await expect(caller.locator('[data-call-status="connected"]')).toBeVisible({ timeout: 15_000 });
      await caller.getByRole('button', { name: 'Watch Together while on this call' }).click();
      await expect(caller).toHaveURL(/\/universe\/together\/watch$/);
      await expect(caller.locator('[data-watch-call-status="connected"]')).toBeVisible();

      await callerPanel.getByRole('button', { name: 'End call' }).click();
      await expect(callerPanel.getByRole('button', { name: 'Video call' })).toBeEnabled({ timeout: 12_000 });
    } finally {
      await Promise.all([callerContext.close(), calleeContext.close()]);
    }
  });

});
