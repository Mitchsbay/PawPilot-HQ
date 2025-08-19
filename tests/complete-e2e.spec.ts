import { test, expect } from '@playwright/test';

test.describe('Complete E2E User Journey', () => {
  test('complete user journey from signup to advanced features', async ({ page, context }) => {
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    
    // 1. Sign up new user
    await page.goto('/auth/signup');
    await page.fill('input[name="displayName"]', 'Test User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'password123');
    await page.check('input[name="agreeToTerms"]');
    await page.click('button[type="submit"]');
    
    // Should redirect to onboarding
    await page.waitForURL('/onboarding');
    
    // 2. Complete onboarding
    // Skip avatar upload
    await page.click('button:has-text("Continue")');
    
    // Add first pet
    await page.fill('input[placeholder*="pet\'s name"]', 'Buddy');
    await page.selectOption('select', 'dog');
    await page.click('button:has-text("Continue")');
    
    // Skip interests
    await page.click('button:has-text("Continue")');
    
    // Finish setup
    await page.click('button:has-text("Get Started!")');
    await page.waitForURL('/dashboard');
    
    // 3. Test core features
    // Create a post
    await page.goto('/feed');
    await page.click('button:has-text("Post Now")');
    await page.fill('textarea[placeholder*="mind"]', 'My first post with Buddy!');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Post created successfully!')).toBeVisible();
    
    // 4. Test health tracking
    await page.goto('/health');
    await page.click('button:has-text("Add Record")');
    await page.selectOption('select[required]', { index: 1 }); // Select first pet
    await page.fill('input[placeholder*="title"]', 'Annual Checkup');
    await page.fill('textarea[placeholder*="notes"]', 'Buddy is healthy and happy!');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Health record added successfully!')).toBeVisible();
    
    // 5. Test privacy settings
    await page.goto('/settings');
    await page.click('button:has-text("Advanced Privacy")');
    
    const profileSelect = page.locator('text=Profile Visibility').locator('..').locator('select');
    await profileSelect.selectOption('friends');
    await expect(page.locator('text=Privacy setting updated')).toBeVisible();
    
    // 6. Test notifications
    await page.goto('/notifications');
    await expect(page.locator('h1:has-text("Notifications")')).toBeVisible();
    
    // 7. Test search functionality
    await page.click('button[title="Quick Search"]');
    await page.fill('input[placeholder*="Search"]', 'Buddy');
    await expect(page.locator('text=Searching...')).toBeVisible();
    await page.press('Escape'); // Close search
    
    // 8. Test groups
    await page.goto('/groups');
    await page.click('button:has-text("Create Group")');
    await page.fill('input[placeholder*="group name"]', 'Dog Lovers');
    await page.fill('textarea[placeholder*="about"]', 'A group for dog enthusiasts');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Group created successfully!')).toBeVisible();
    
    // 9. Test events
    await page.goto('/events');
    await page.click('button:has-text("Create Event")');
    await page.fill('input[placeholder*="event title"]', 'Dog Park Meetup');
    
    // Set future date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', dateString);
    
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Event created successfully!')).toBeVisible();
    
    // 10. Test analytics
    await page.goto('/settings');
    await page.click('button:has-text("Analytics")');
    await expect(page.locator('text=Your Analytics')).toBeVisible();
    await expect(page.locator('text=Total Posts')).toBeVisible();
  });

  test('real-time messaging features work correctly', async ({ page, context }) => {
    // Create second browser context for real-time testing
    const secondContext = await context.browser()?.newContext();
    const secondPage = await secondContext?.newPage();

    const timestamp = Date.now();
    
    // Login both users
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', `user1${timestamp}@example.com`);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    await secondPage?.goto('/auth/login');
    await secondPage?.fill('input[type="email"]', `user2${timestamp}@example.com`);
    await secondPage?.fill('input[type="password"]', 'password123');
    await secondPage?.click('button[type="submit"]');
    await secondPage?.waitForURL('/dashboard');

    // Test real-time messaging
    await page.goto('/messages');
    await secondPage?.goto('/messages');
    
    // Start conversation (if conversations exist)
    const conversationExists = await page.locator('.conversation-item').count() > 0;
    if (conversationExists) {
      await page.click('.conversation-item:first-child');
      await secondPage?.click('.conversation-item:first-child');
      
      // Send message from first user
      await page.fill('input[placeholder*="Type a message"]', 'Hello from user 1!');
      await page.press('input[placeholder*="Type a message"]', 'Enter');
      
      // Second user should see the message
      await expect(secondPage?.locator('text=Hello from user 1!')).toBeVisible({ timeout: 10000 });
      
      // Test typing indicators
      await secondPage?.fill('input[placeholder*="Type a message"]', 'Typing response...');
      await expect(page.locator('text=is typing')).toBeVisible({ timeout: 5000 });
      
      // Test online status
      await expect(page.locator('.online-indicator')).toBeVisible();
    }
    
    await secondPage?.close();
    await secondContext?.close();
  });

  test('push notifications work correctly', async ({ page, context }) => {
    // Mock notification API
    await page.addInitScript(() => {
      // Mock Notification API
      Object.defineProperty(window, 'Notification', {
        value: {
          permission: 'default',
          requestPermission: async () => 'granted'
        }
      });

      // Mock service worker
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: async () => ({
            pushManager: {
              subscribe: async () => ({
                endpoint: 'https://fcm.googleapis.com/fcm/send/test',
                getKey: () => new Uint8Array(65),
                toJSON: () => ({
                  endpoint: 'https://fcm.googleapis.com/fcm/send/test',
                  keys: {
                    p256dh: 'test-key',
                    auth: 'test-auth'
                  }
                })
              })
            }
          }),
          ready: Promise.resolve({
            pushManager: {
              getSubscription: async () => null,
              subscribe: async () => ({
                endpoint: 'https://fcm.googleapis.com/fcm/send/test',
                getKey: () => new Uint8Array(65),
                toJSON: () => ({
                  endpoint: 'https://fcm.googleapis.com/fcm/send/test',
                  keys: {
                    p256dh: 'test-key',
                    auth: 'test-auth'
                  }
                })
              })
            }
          })
        }
      });
    });

    // Login
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Navigate to settings
    await page.goto('/settings');
    await page.click('button:has-text("Notifications")');
    
    // Enable push notifications
    const pushToggle = page.locator('text=Browser Notifications').locator('..').locator('button');
    await pushToggle.click();
    
    // Should show success message
    await expect(page.locator('text=Push notifications enabled!')).toBeVisible();
  });

  test('privacy controls work correctly', async ({ page, context }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Test advanced privacy controls
    await page.goto('/settings');
    await page.click('button:has-text("Advanced Privacy")');
    
    // Set posts to custom
    const postsSelect = page.locator('text=Posts Visibility').locator('..').locator('select');
    await postsSelect.selectOption('custom');
    
    // Should show custom rules section
    await expect(page.locator('text=Custom Rules')).toBeVisible();
    
    // Test blocking functionality
    await page.click('button:has-text("Blocked Users")');
    await expect(page.locator('text=Blocked Users')).toBeVisible();
  });

  test('file upload functionality works', async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Test avatar upload
    await page.goto('/settings');
    
    // Create a test image file
    const testImageDataUrl = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#blue';
        ctx.fillRect(0, 0, 100, 100);
      }
      return canvas.toDataURL('image/png');
    });

    // Mock file input
    await page.evaluate((dataUrl) => {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        // Convert data URL to blob
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const file = new File([u8arr], 'test-avatar.png', { type: mime });
        
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, testImageDataUrl);

    // Should show upload preview
    await expect(page.locator('img[alt="Avatar preview"]')).toBeVisible();
  });
});

test.describe('Admin Features', () => {
  test('admin panel access and functionality', async ({ page }) => {
    // Login as admin user
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Access admin panel
    await page.goto('/admin');
    await expect(page.locator('h1:has-text("Admin Panel")')).toBeVisible();
    
    // Check dashboard stats
    await expect(page.locator('text=Total Users')).toBeVisible();
    await expect(page.locator('text=Total Posts')).toBeVisible();
    
    // Test reports management
    await page.click('button:has-text("Reports")');
    await expect(page.locator('text=All Reports')).toBeVisible();
    
    // Test user management
    await page.click('button:has-text("Users")');
    await expect(page.locator('text=All Roles')).toBeVisible();
  });
});

test.describe('Real-time Features', () => {
  test('online status and presence indicators', async ({ page, context }) => {
    // Create second browser context
    const secondContext = await context.browser()?.newContext();
    const secondPage = await secondContext?.newPage();

    // Login both users
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

    // Navigate to messages
    await page.goto('/messages');
    
    // Should see online indicator for second user (if conversations exist)
    const hasConversations = await page.locator('.conversation-item').count() > 0;
    if (hasConversations) {
      await expect(page.locator('.online-indicator')).toBeVisible();
    }
    
    // Close second user's page
    await secondPage?.close();
    await secondContext?.close();
    
    // Wait a moment for status to update
    await page.waitForTimeout(2000);
    
    // Should show offline status
    if (hasConversations) {
      await expect(page.locator('.offline-indicator')).toBeVisible();
    }
  });

  test('real-time notifications', async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Navigate to notifications
    await page.goto('/notifications');
    
    // Should load notifications page
    await expect(page.locator('h1:has-text("Notifications")')).toBeVisible();
    
    // Test notification filters
    await page.click('button:has-text("Unread")');
    await page.click('button:has-text("All")');
    
    // Test notification search
    await page.fill('input[placeholder*="Search notifications"]', 'test');
  });
});

test.describe('Content Management', () => {
  test('draft and scheduled posts', async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Test post scheduling
    await page.goto('/feed');
    await page.click('button:has-text("Schedule Post")');
    await page.fill('textarea[placeholder*="share"]', 'This is a scheduled post');
    
    // Set future date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', dateString);
    
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Post scheduled successfully!')).toBeVisible();

    // Check drafts in settings
    await page.goto('/settings');
    await page.click('button:has-text("Drafts & Scheduled")');
    await expect(page.locator('text=Content Manager')).toBeVisible();
  });

  test('saved posts functionality', async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Navigate to saved posts
    await page.goto('/settings');
    await page.click('button:has-text("Saved Posts")');
    await expect(page.locator('text=Saved Posts')).toBeVisible();
  });
});

test.describe('Search and Discovery', () => {
  test('global search functionality', async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Test global search
    await page.click('button[title="Quick Search"]');
    await page.fill('input[placeholder*="Search users"]', 'test');
    
    // Should show search interface
    await expect(page.locator('text=Start typing to search')).toBeVisible();
    
    // Close search
    await page.press('Escape');
  });

  test('advanced search with filters', async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Test advanced search
    await page.click('button[title="Advanced Search"]');
    await page.fill('input[placeholder*="Search users"]', 'test');
    
    // Test filters
    await page.click('button:has-text("Filters")'); // Toggle filters
    await page.selectOption('select', 'users'); // Content type filter
    
    // Should show advanced search interface
    await expect(page.locator('text=Advanced Search')).toBeVisible();
  });
});