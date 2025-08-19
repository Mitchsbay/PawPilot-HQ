import { test, expect } from '@playwright/test';

test.describe('User Presence', () => {
  test('should show online status indicators', async ({ page, context }) => {
    // Create second browser context for second user
    const secondContext = await context.browser()?.newContext();
    const secondPage = await secondContext?.newPage();

    // First user login
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'user1@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Second user login
    await secondPage?.goto('/auth/login');
    await secondPage?.fill('input[type="email"]', 'user2@example.com');
    await secondPage?.fill('input[type="password"]', 'password123');
    await secondPage?.click('button[type="submit"]');
    await secondPage?.waitForURL('/dashboard');

    // Navigate to messages
    await page.goto('/messages');
    
    // Should see online indicator for second user
    await expect(page.locator('.online-indicator')).toBeVisible();
    
    // Close second user's page
    await secondPage?.close();
    await secondContext?.close();
    
    // Wait a moment for status to update
    await page.waitForTimeout(2000);
    
    // Should show offline status
    await expect(page.locator('.offline-indicator')).toBeVisible();
  });

  test('should show typing indicators', async ({ page, context }) => {
    const secondContext = await context.browser()?.newContext();
    const secondPage = await secondContext?.newPage();

    // Setup both users
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'user1@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    await secondPage?.goto('/auth/login');
    await secondPage?.fill('input[type="email"]', 'user2@example.com');
    await secondPage?.fill('input[type="password"]', 'password123');
    await secondPage?.click('button[type="submit"]');
    await secondPage?.waitForURL('/dashboard');

    // Both navigate to same conversation
    await page.goto('/messages');
    await secondPage?.goto('/messages');
    
    // Click on conversation
    await page.click('.conversation-item:first-child');
    await secondPage?.click('.conversation-item:first-child');
    
    // Second user starts typing
    await secondPage?.fill('input[placeholder*="Type a message"]', 'Hello');
    
    // First user should see typing indicator
    await expect(page.locator('text=is typing')).toBeVisible();
    
    await secondPage?.close();
    await secondContext?.close();
  });
});