import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test('displays password login form by default', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
    await expect(page.locator('#magic-email')).toHaveCount(0);
  });

  test('can switch to magic link form', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /password-free sign-in link/i }).click();
    await expect(page.locator('#magic-email')).toBeVisible();
    await expect(page.locator('#login-password')).toHaveCount(0);
  });

  test('has link to signup page', async ({ page }) => {
    await page.goto('/login');
    await page
      .getByRole('link', { name: /sign up/i })
      .last()
      .click();
    await expect(page).toHaveURL('/signup');
  });
});
