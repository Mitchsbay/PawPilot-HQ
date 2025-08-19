import { test, expect } from '@playwright/test';

test.describe('Push Notifications', () => {
  test.beforeEach(async ({ page }) => {
    // Mock service worker and notification API
    await page.addInitScript(() => {
      // Mock Notification API
      window.Notification = {
        permission: 'default',
        requestPermission: async () => 'granted'
      } as any;

      // Mock service worker
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: async () => ({
            pushManager: {
              subscribe: async () => ({
                endpoint: 'https://fcm.googleapis.com/fcm/send/test',
                getKey: () => new Uint8Array(65)
              })
            }
          }),
          ready: Promise.resolve({
            pushManager: {
              getSubscription: async () => null,
              subscribe: async () => ({
                endpoint: 'https://fcm.googleapis.com/fcm/send/test',
                getKey: () => new Uint8Array(65)
              })
            }
          })
        }
      });
    });

    // Navigate to login and authenticate
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should enable push notifications', async ({ page }) => {
    // Navigate to settings
    await page.goto('/settings');
    
    // Click on notifications tab
    await page.click('button:has-text("Notifications")');
    
    // Find and click the push notifications toggle
    const pushToggle = page.locator('text=Browser Notifications').locator('..').locator('button');
    await pushToggle.click();
    
    // Should show success message
    await expect(page.locator('text=Push notifications enabled!')).toBeVisible();
  });

  test('should disable push notifications', async ({ page }) => {
    // Navigate to settings and enable first
    await page.goto('/settings');
    await page.click('button:has-text("Notifications")');
    
    const pushToggle = page.locator('text=Browser Notifications').locator('..').locator('button');
    await pushToggle.click(); // Enable
    await pushToggle.click(); // Disable
    
    // Should show success message
    await expect(page.locator('text=Push notifications disabled')).toBeVisible();
  });
});