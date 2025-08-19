import { test, expect } from '@playwright/test';

test.describe('Activity Feed', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should show activity when user creates post', async ({ page, context }) => {
    // Create a post
    await page.goto('/feed');
    await page.click('button:has-text("Post Now")');
    await page.fill('textarea[placeholder*="What\'s on your mind"]', 'Test post for activity feed');
    await page.click('button[type="submit"]');
    
    // Wait for post creation
    await expect(page.locator('text=Post created successfully!')).toBeVisible();
    
    // Navigate to profile
    await page.goto('/settings');
    await page.click('a[href*="/profile/"]'); // Assuming profile link exists
    
    // Click activity tab
    await page.click('button:has-text("Activity")');
    
    // Should see the post activity
    await expect(page.locator('text=shared a new post')).toBeVisible();
  });

  test('should respect activity visibility settings', async ({ page, context }) => {
    // Set activity to private
    await page.goto('/settings');
    await page.click('button:has-text("Advanced Privacy")');
    
    const activitySelect = page.locator('text=Activity Visibility').locator('..').locator('select');
    await activitySelect.selectOption('private');
    
    // Create second user context
    const secondContext = await context.browser()?.newContext();
    const secondPage = await secondContext?.newPage();
    
    await secondPage?.goto('/auth/login');
    await secondPage?.fill('input[type="email"]', 'user2@example.com');
    await secondPage?.fill('input[type="password"]', 'password123');
    await secondPage?.click('button[type="submit"]');
    await secondPage?.waitForURL('/dashboard');

    // Get first user's ID and navigate to their profile
    const userId = await page.evaluate(() => {
      return localStorage.getItem('supabase.auth.token') ? 
        JSON.parse(localStorage.getItem('supabase.auth.token') || '{}').user?.id : null;
    });

    await secondPage?.goto(`/profile/${userId}`);
    await secondPage?.click('button:has-text("Activity")');
    
    // Should not see any activity (private setting)
    await expect(secondPage?.locator('text=No activity yet')).toBeVisible();
    
    await secondPage?.close();
    await secondContext?.close();
  });
});