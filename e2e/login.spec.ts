import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test('displays password login form by default', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#magic-email')).toHaveCount(0);
  });

  test('can switch to magic link form', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /password-free|매직|링크/i }).click();
    await expect(page.locator('#magic-email')).toBeVisible();
    await expect(page.locator('#password')).toHaveCount(0);
  });

  test('shows validation on empty password submit', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /sign in|로그인/i }).click();
    const emailInput = page.locator('#email');
    await expect(emailInput).toHaveAttribute('required', '');
  });

  test('has link to signup page', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /sign up/i }).last().click();
    await expect(page).toHaveURL('/signup');
  });
});
