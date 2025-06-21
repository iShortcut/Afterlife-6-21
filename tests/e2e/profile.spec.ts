import { test, expect } from '@playwright/test';

test.describe('Profile', () => {
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

    // Mock profile data
    await page.route('**/rest/v1/profiles?*', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([{
          id: 'test-user-id',
          full_name: 'Test User',
          username: 'testuser',
          avatar_url: null,
          bio: 'Test bio',
        }]),
      });
    });

    // Login
    await page.goto('/login');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password');
    await page.getByRole('button', { name: 'Sign In' }).click();
  });

  test('should show profile settings', async ({ page }) => {
    await page.goto('/profile');
    
    await expect(page.getByRole('heading', { name: 'Profile Settings' })).toBeVisible();
    await expect(page.getByLabel('Full Name')).toBeVisible();
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Bio')).toBeVisible();
  });

  test('should populate profile form with user data', async ({ page }) => {
    await page.goto('/profile');
    
    await expect(page.getByLabel('Full Name')).toHaveValue('Test User');
    await expect(page.getByLabel('Username')).toHaveValue('testuser');
    await expect(page.getByLabel('Email')).toHaveValue('test@example.com');
    await expect(page.getByLabel('Bio')).toHaveValue('Test bio');
  });

  test('should validate profile updates', async ({ page }) => {
    await page.goto('/profile');
    
    // Clear required field
    await page.getByLabel('Full Name').clear();
    
    // Try to save
    await page.getByRole('button', { name: 'Save Changes' }).click();
    
    await expect(page.getByText('Full name is required')).toBeVisible();
  });
});