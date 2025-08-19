import { test, expect } from '@playwright/test';

test.describe('Privacy Controls', () => {
  test('should respect private profile settings', async ({ page, context }) => {
    // Login as first user
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'user1@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Set profile to private
    await page.goto('/settings');
    await page.click('button:has-text("Advanced Privacy")');
    
    const profileSelect = page.locator('select').first();
    await profileSelect.selectOption('private');
    
    // Should show success message
    await expect(page.locator('text=Privacy setting updated')).toBeVisible();

    // Create second browser context (logged out user)
    const secondContext = await context.browser()?.newContext();
    const secondPage = await secondContext?.newPage();

    // Try to view profile as logged out user
    const userId = await page.evaluate(() => {
      return localStorage.getItem('supabase.auth.token') ? 
        JSON.parse(localStorage.getItem('supabase.auth.token') || '{}').user?.id : null;
    });

    await secondPage?.goto(`/profile/${userId}`);
    
    // Should show access denied or profile not found
    await expect(secondPage?.locator('text=Profile not found')).toBeVisible();
    
    await secondPage?.close();
    await secondContext?.close();
  });

  test('should allow custom privacy overrides', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Navigate to advanced privacy settings
    await page.goto('/settings');
    await page.click('button:has-text("Advanced Privacy")');
    
    // Set posts to custom
    const postsSelect = page.locator('text=Posts Visibility').locator('..').locator('select');
    await postsSelect.selectOption('custom');
    
    // Add a custom exception
    await page.click('button:has-text("Add Exception")');
    
    // Search for a user
    await page.fill('input[placeholder="Search users..."]', 'test');
    
    // Click allow for first user
    await page.click('button:has-text("Allow"):first');
    
    // Should show success message
    await expect(page.locator('text=Privacy override added')).toBeVisible();
  });
});