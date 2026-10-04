import { test, expect, type Page, type Route } from '@playwright/test';

// Logout leaves for /login *before* clearing the session, so ProtectedRoute's
// own redirect cannot overwrite the "signed out" state. That ordering only
// exists in a real router — the Header unit test mocks useNavigate — so this
// drives it end to end against a faked auth API (no Rails needed).
//
// Every request that leaves the dev server is intercepted: auth endpoints are
// answered, everything else is aborted. Nothing reaches VITE_API_URL even when
// .env points it at a real backend.

const APP_ORIGIN = 'http://localhost:5173';
const ADMIN = { id: 1, email: 'qa.admin@example.com', name: 'QA Admin', role: 'admin' };

const corsHeaders = {
  'access-control-allow-origin': APP_ORIGIN,
  'access-control-allow-credentials': 'true',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

async function fakeBackend(page: Page) {
  const state = { loggedOut: false, logoutCalls: 0 };

  await page.route(
    (url) => url.origin !== APP_ORIGIN,
    async (route: Route) => {
      const request = route.request();
      const { pathname } = new URL(request.url());

      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      if (pathname === '/api/v1/auth/refresh') {
        return state.loggedOut
          ? route.fulfill({ status: 401, headers: corsHeaders, json: { error: 'unauthorized' } })
          : route.fulfill({
              headers: corsHeaders,
              json: { token: 'fake-access-token', user: ADMIN },
            });
      }
      if (pathname === '/api/v1/auth/logout') {
        state.loggedOut = true;
        state.logoutCalls += 1;
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.abort();
    },
  );

  return state;
}

test.describe('Account menu logout', () => {
  test('logs out from a protected page and lands on /login with the signed-out notice', async ({
    page,
  }) => {
    const backend = await fakeBackend(page);
    await page.goto('/dashboard');

    const trigger = page.getByRole('button', { name: /account menu/i });
    await expect(trigger).toBeVisible();
    await expect(trigger).toContainText('QA Admin');

    await trigger.click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    // The identity block sits beside role='menu' in the same dropdown, and the
    // dashboard shows the email too — scope to the dropdown.
    await expect(menu.locator('..').getByText(ADMIN.email)).toBeVisible();

    await page.getByRole('menuitem', { name: /logout/i }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('status')).toContainText(/signed out/i);
    await expect(page.getByRole('button', { name: /account menu/i })).toHaveCount(0);
    expect(backend.logoutCalls).toBe(1);

    // The flag is consumed: a refresh must not announce "signed out" again.
    await page.reload();
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.getByText(/you've been signed out/i)).toHaveCount(0);
  });

  test('Escape closes the menu and returns focus to the trigger', async ({ page }) => {
    await fakeBackend(page);
    await page.goto('/dashboard');

    const trigger = page.getByRole('button', { name: /account menu/i });
    await trigger.click();
    await expect(page.getByRole('menuitem').first()).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
});
