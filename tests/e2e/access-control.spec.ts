import { test, expect } from '@playwright/test';

test.describe('Access Control', () => {
  // Test users
  const userA = {
    email: 'user.a@example.com',
    password: 'password123',
  };
  const userB = {
    email: 'user.b@example.com',
    password: 'password123',
  };

  test.beforeEach(async ({ page }) => {
    // Mock Supabase auth and database responses
    await page.route('**/auth/v1/token?grant_type=password', async (route) => {
      const requestBody = JSON.parse(route.request().postData() || '{}');
      const email = requestBody.email;

      // Return different user IDs based on email
      const userId = email === userA.email ? 'user-a-id' : 'user-b-id';

      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          access_token: 'test-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'test-refresh-token',
          user: {
            id: userId,
            email: email,
          },
        }),
      });
    });
  });

  test('Profile access control', async ({ page }) => {
    // 1. Log in as User A
    await page.goto('/login');
    await page.getByLabel('Email').fill(userA.email);
    await page.getByLabel('Password').fill(userA.password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Update profile
    await page.goto('/profile');
    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await page.getByLabel('Full Name').fill('User A');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // Mock profile update response
    await page.route('**/rest/v1/profiles?id=eq.user-a-id', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([{
            id: 'user-a-id',
            full_name: 'User A',
          }]),
        });
      }
    });

    // Verify profile was updated
    await expect(page.getByText('Profile updated successfully')).toBeVisible();

    // Sign out User A
    await page.getByRole('button', { name: 'Sign Out' }).click();

    // 2. Log in as User B
    await page.goto('/login');
    await page.getByLabel('Email').fill(userB.email);
    await page.getByLabel('Password').fill(userB.password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Try to access User A's profile data
    await page.route('**/rest/v1/profiles?id=eq.user-a-id*', async (route) => {
      await route.fulfill({
        status: 401,
        body: JSON.stringify({ message: 'Unauthorized' }),
      });
    });

    // Verify access is denied
    await expect(page.getByText('Unauthorized')).toBeVisible();
  });

  test('Unauthenticated access', async ({ page }) => {
    // Try to access profile without authentication
    await page.goto('/profile');
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });
});