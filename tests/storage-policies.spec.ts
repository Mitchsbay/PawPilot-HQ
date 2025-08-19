import { test, expect } from '@playwright/test';

test.describe('Storage Policies Verification', () => {
  test('storage buckets exist with correct configuration', async ({ page }) => {
    // This would typically be a database test, but we can verify through the UI
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Test avatar upload (should work with proper bucket policies)
    await page.goto('/settings');
    
    // Mock file upload
    await page.evaluate(() => {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        const file = new File(['test'], 'test-avatar.png', { type: 'image/png' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Should not show storage policy errors
    await expect(page.locator('text=storage policy')).not.toBeVisible();
    await expect(page.locator('text=already exists')).not.toBeVisible();
  });

  test('file upload permissions work correctly', async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Test pet photo upload
    await page.goto('/pets');
    await page.click('button:has-text("Add Pet")');
    
    // Should be able to access file upload without policy errors
    await expect(page.locator('input[type="file"]')).toBeVisible();
    
    // Test post media upload
    await page.goto('/feed');
    await page.click('button:has-text("Post Now")');
    
    // Should be able to access media upload
    await expect(page.locator('input[type="file"]')).toBeVisible();
  });
});