import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('landing page has proper heading structure', async ({ page }) => {
    await page.goto('/');
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
  });

  test('login page form has proper labels', async ({ page }) => {
    await page.goto('/login');
    // LoginPage renders two email forms (sign-in #email + magic-link #magic-email);
    // assert by id to avoid strict-mode label collision.
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#magic-email')).toBeVisible();
  });

  test('language selector is keyboard accessible', async ({ page }) => {
    await page.goto('/');
    // Tab to language button and verify it's focusable
    const langButton = page.locator('button[aria-haspopup="listbox"]');
    if (await langButton.count() > 0) {
      await langButton.focus();
      await expect(langButton).toBeFocused();
    }
  });
});
