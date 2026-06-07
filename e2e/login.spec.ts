import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test('displays magic link login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#magic-email')).toBeVisible();
    await expect(page.locator('#password')).toHaveCount(0);
    await expect(page.getByText(/password-free sign-in/i)).toBeVisible();
  });

  test('shows magic link validation on empty submit', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /email me a sign-in link/i }).click();
    await expect(page.getByText(/email is required/i)).toBeVisible();
  });

  test('has link to signup page', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /sign up/i }).last().click();
    await expect(page).toHaveURL('/signup');
  });
});
