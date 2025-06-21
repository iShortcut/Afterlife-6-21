import { test, expect } from '@playwright/test';

test.describe('Memorials', () => {
  test('should show public memorials on home page', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByRole('heading', { name: 'Featured Memorials' })).toBeVisible();
  });

  test('should require authentication for creating memorial', async ({ page }) => {
    await page.goto('/create-memorial');
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });

  test.describe('authenticated', () => {
    test.beforeEach(async ({ page }) => {
      // Mock authentication
      await page.route('**/auth/v1/token?grant_type=password', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            access_token: 'test-token',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'test-refresh-token',
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
            },
          }),
        });
      });

      // Login
      await page.goto('/login');
      await page.getByLabel('Email').fill('test@example.com');
      await page.getByLabel('Password').fill('password');
      await page.getByRole('button', { name: 'Sign In' }).click();
    });

    test('should show memorial creation form', async ({ page }) => {
      await page.goto('/create-memorial');
      
      await expect(page.getByRole('heading', { name: 'Create a Memorial' })).toBeVisible();
      await expect(page.getByLabel('Memorial Title')).toBeVisible();
      await expect(page.getByLabel('Bio / Description')).toBeVisible();
      await expect(page.getByLabel('Birth Date')).toBeVisible();
      await expect(page.getByLabel('Death Date')).toBeVisible();
    });

    test('should validate memorial creation form', async ({ page }) => {
      await page.goto('/create-memorial');
      
      // Try to submit empty form
      await page.getByRole('button', { name: 'Create Memorial' }).click();
      
      await expect(page.getByText('Please provide a title for the memorial')).toBeVisible();
    });

    test('should show user\'s memorials in dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      
      await expect(page.getByRole('heading', { name: 'Your Memorials' })).toBeVisible();
    });
  });
});