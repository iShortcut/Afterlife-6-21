import { test, expect } from '@playwright/test';

test.describe('Products', () => {
  test('should show products page', async ({ page }) => {
    await page.goto('/products');
    
    await expect(page.getByRole('heading', { name: 'Products & Subscriptions' })).toBeVisible();
  });

  test('should require authentication for purchases', async ({ page }) => {
    await page.goto('/products');
    
    // Mock products data
    await page.route('**/rest/v1/products?*', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([{
          id: 'test-product-id',
          name: 'Digital Candle',
          description: 'Light a virtual candle',
          price: 5.00,
          type: 'DIGITAL',
          metadata: {
            stripe_price_id: 'test-price-id',
            currency: 'USD',
            duration_days: 7
          }
        }]),
      });
    });

    // Try to purchase without being logged in
    await page.getByRole('button', { name: 'Purchase' }).click();
    
    // Should show error toast
    await expect(page.getByText('Please sign in to make a purchase')).toBeVisible();
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

    test('should initiate Stripe checkout', async ({ page }) => {
      await page.goto('/products');
      
      // Mock Stripe checkout session creation
      await page.route('**/functions/v1/create-product-checkout', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            url: 'https://checkout.stripe.com/test-session',
          }),
        });
      });

      // Click purchase button
      await page.getByRole('button', { name: 'Purchase' }).click();
      
      // Should redirect to Stripe
      await expect(page).toHaveURL('https://checkout.stripe.com/test-session');
    });
  });
});