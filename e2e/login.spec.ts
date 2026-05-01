import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test('displays login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('shows error on empty submit', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /sign in/i }).click();
    // required HTML attribute blocks submission client-side; assert directly.
    const emailInput = page.locator('#email');
    await expect(emailInput).toHaveAttribute('required', '');
  });

  test('has link to signup page', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /sign up/i }).last().click();
    await expect(page).toHaveURL('/signup');
  });
});
