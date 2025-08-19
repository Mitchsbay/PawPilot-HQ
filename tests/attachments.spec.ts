import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Message Attachments', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should upload and display image attachment', async ({ page }) => {
    // Navigate to messages
    await page.goto('/messages');
    
    // Click on a conversation
    await page.click('.conversation-item:first-child');
    
    // Upload an image
    const fileInput = page.locator('input[type="file"]');
    const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');
    
    // Create a test image file if it doesn't exist
    await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#blue';
        ctx.fillRect(0, 0, 100, 100);
      }
      return canvas.toDataURL();
    });
    
    await fileInput.setInputFiles(testImagePath);
    
    // Should show upload progress
    await expect(page.locator('text=Uploading file')).toBeVisible();
    
    // Should show attachment in message
    await expect(page.locator('.attachment-preview')).toBeVisible();
    
    // Should be able to download
    await page.click('button[title="Download"]');
  });

  test('should handle file size limits', async ({ page }) => {
    await page.goto('/messages');
    await page.click('.conversation-item:first-child');
    
    // Mock a large file upload
    await page.evaluate(() => {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        const largeFile = new File(['x'.repeat(25 * 1024 * 1024)], 'large-file.txt', {
          type: 'text/plain'
        });
        
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(largeFile);
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    
    // Should show error message
    await expect(page.locator('text=File must be less than 20MB')).toBeVisible();
  });
});