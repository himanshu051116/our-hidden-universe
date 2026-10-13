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

      await expect(caller.getByRole('button', { name: 'End call' })).toBeVisible({ timeout: 40_000 });
      await expect(callee.getByRole('button', { name: 'End call' })).toBeVisible({ timeout: 40_000 });

      await expect(caller.getByText(/quality/i)).toBeVisible();
      await expect(callee.getByText(/quality/i)).toBeVisible();

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
});
