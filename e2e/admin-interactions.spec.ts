import { test, expect, type Page, type Route } from '@playwright/test';

// Keyboard/ARIA behaviour of the admin view tabs, the collapsible admin widgets
// and the dashboard weather carousel (DESIGN.md §10.3), in a real browser.
//
// Same isolation as account-menu-logout.spec.ts: every request that leaves the
// dev server is intercepted. Auth and Open-Meteo are answered with fixtures,
// everything else is aborted — this is NOT an authenticated-backend e2e run.

const APP_ORIGIN = 'http://localhost:5173';
const ADMIN = { id: 1, email: 'qa.admin@example.com', name: 'QA Admin', role: 'admin' };

const corsHeaders = {
  'access-control-allow-origin': APP_ORIGIN,
  'access-control-allow-credentials': 'true',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

async function fakeBackend(page: Page) {
  await page.route(
    (url) => url.origin !== APP_ORIGIN,
    async (route: Route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      if (url.pathname === '/api/v1/auth/refresh') {
        return route.fulfill({
          headers: corsHeaders,
          json: { token: 'fake-access-token', user: ADMIN },
        });
      }
      if (url.hostname === 'api.open-meteo.com') {
        const count = (url.searchParams.get('latitude') ?? '').split(',').length;
        return route.fulfill({
          headers: { 'access-control-allow-origin': '*' },
          json: Array.from({ length: count }, (_, i) => ({
            current: { temperature_2m: 10 + i, weather_code: 0, wind_speed_10m: 5 },
          })),
        });
      }
      return route.abort();
    },
  );
}

test.describe('Admin view tabs', () => {
  test('arrow keys switch views and the panel follows the selected tab', async ({ page }) => {
    await fakeBackend(page);
    await page.goto('/admin');

    const tablist = page.getByRole('tablist', { name: 'Quote views' });
    const calculator = tablist.getByRole('tab', { name: 'Calculator' });
    const history = tablist.getByRole('tab', { name: 'History' });
    await expect(calculator).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel', { name: 'Calculator' })).toBeVisible();

    await calculator.focus();
    await page.keyboard.press('ArrowRight');

    await expect(history).toBeFocused();
    await expect(history).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel', { name: 'History' })).toBeVisible();

    // One tab stop: Shift+Tab from the selected tab leaves the tablist instead
    // of landing on the unselected tab.
    await page.keyboard.press('Shift+Tab');
    await expect(calculator).not.toBeFocused();
    await expect(history).not.toBeFocused();
  });
});

test.describe('Admin collapsible widgets', () => {
  test('a widget opens from the keyboard and exposes its expanded state', async ({ page }) => {
    await fakeBackend(page);
    await page.goto('/admin');

    // Scope to the section heading (h4): once open, the audit log body renders
    // its own "Audit Log" h3 and controls with the same name.
    const heading = page.getByRole('heading', { name: 'Audit Log', exact: true, level: 4 });
    const trigger = heading.getByRole('button');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await trigger.focus();
    await page.keyboard.press('Enter');

    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('region', { name: 'Audit Log', exact: true })).toBeVisible();

    await page.keyboard.press('Space');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('region', { name: 'Audit Log', exact: true })).toBeHidden();
  });
});

test.describe('Dashboard weather carousel', () => {
  const carouselOf = (page: Page) =>
    page.getByRole('region', { name: 'Global Port & Airport Weather & Alerts' });

  test('rotation can be stopped and stays stopped', async ({ page }) => {
    await page.clock.install();
    await fakeBackend(page);
    await page.goto('/dashboard');

    const carousel = carouselOf(page);
    await expect(carousel).toHaveAttribute('aria-roledescription', 'carousel');
    await expect(carousel.getByText(/^1 \/ \d+$/)).toBeVisible();

    await carousel.getByRole('button', { name: 'Stop automatic rotation' }).click();
    await expect(carousel.getByRole('button', { name: 'Start automatic rotation' })).toBeVisible();
    // Move pointer and focus away so only the explicit stop holds rotation.
    await page.mouse.move(0, 0);
    await page.locator('body').focus();
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

    await page.clock.fastForward(12_000);
    await expect(carousel.getByText(/^1 \/ \d+$/)).toBeVisible();
  });

  test('rotates on its own when nothing holds it', async ({ page }) => {
    await page.clock.install();
    await fakeBackend(page);
    await page.goto('/dashboard');

    const carousel = carouselOf(page);
    await expect(carousel.getByText(/^1 \/ \d+$/)).toBeVisible();
    await page.mouse.move(0, 0);

    await page.clock.fastForward(5_500);
    await expect(carousel.getByText(/^2 \/ \d+$/)).toBeVisible();
  });

  test('reduced motion starts stopped', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.install();
    await fakeBackend(page);
    await page.goto('/dashboard');

    const carousel = carouselOf(page);
    await expect(carousel.getByRole('button', { name: 'Start automatic rotation' })).toBeVisible();
    await page.clock.fastForward(12_000);
    await expect(carousel.getByText(/^1 \/ \d+$/)).toBeVisible();
  });
});
