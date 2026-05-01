import { test, expect } from '@playwright/test';

// The Rails API under test must be running in RAILS_ENV=test and expose the
// GET /api/v1/auth/magic_link/peek endpoint. The user fixture below must exist
// in the test DB (seed or beforeAll via API). If the API is not reachable at
// VITE_API_URL the test suite will skip.
const API_URL = process.env.VITE_API_URL ?? 'http://localhost:3000';
const TEST_EMAIL = 'e2e-magic@example.com';

test.describe('magic link auth', () => {
  test.beforeAll(async ({ request }) => {
    // Best effort: ensure the test user exists. Ignore failures so the suite
    // can still skip cleanly when the backend isn't running.
    // `failOnStatusCode: false` only suppresses 4xx/5xx — connect-level errors
    // (ECONNREFUSED) still throw, so wrap in try/catch.
    try {
      await request.post(`${API_URL}/api/v1/auth/register`, {
        data: {
          email: TEST_EMAIL,
          password: 'password123',
          password_confirmation: 'password123',
          name: 'E2E Magic',
          company: 'Test Co',
          nationality: 'KR',
        },
        failOnStatusCode: false,
      });
    } catch {
      // Backend unreachable — proceed; per-test skip handles the actual case.
    }
  });

  test('request → verify → redirect to dashboard', async ({ page, request }) => {
    // 1. Request a magic link. Catch connect-level errors so the test can skip
    // cleanly when the Rails API isn't reachable (e.g. CI with no backend).
    let reqRes: Awaited<ReturnType<typeof request.post>> | null = null;
    try {
      reqRes = await request.post(`${API_URL}/api/v1/auth/magic_link`, {
        data: { email: TEST_EMAIL },
        failOnStatusCode: false,
      });
    } catch {
      // network error — leave reqRes null, skip below.
    }
    test.skip(!reqRes || !reqRes.ok(), 'Rails API not reachable in this environment');

    // 2. Peek the last issued raw token via the test-only endpoint
    const peek = await request.get(`${API_URL}/api/v1/auth/magic_link/peek`);
    test.skip(!peek.ok(), 'peek endpoint not available (API not in test env)');
    const { token } = await peek.json();
    expect(token, 'peek endpoint returned a token').toBeTruthy();

    // 3. Navigate to the verify URL — the page should strip the token and redirect
    await page.goto(`/auth/verify?token=${token}`);
    await expect(page).toHaveURL(/\/dashboard/);

    // 4. URL should no longer contain the raw token after the redirect
    expect(page.url()).not.toContain(token);
  });

  test('invalid token shows error and Back to Login button', async ({ page }) => {
    // Force English locale so i18n strings match the assertion regexes.
    // LanguageContext persists under localStorage key 'smartQuoteLanguage'.
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('smartQuoteLanguage', 'en');
      } catch {
        // localStorage unavailable in some environments — best effort only.
      }
    });
    await page.goto('/auth/verify?token=bogus-token-value');
    // Error states shown can be 'Invalid', 'Expired', 'Not Found', or 'Login Failed'
    // depending on backend availability; assert that *some* error surfaced and the
    // recovery action exists.
    await expect(
      page.getByText(/invalid|expired|not found|login failed/i).first(),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /back to login/i })).toBeVisible();
  });
});
