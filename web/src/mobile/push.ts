import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from "../lib/supabase";
import { telemetry } from "../lib/telemetry";

export async function registerMobilePush(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not authenticated for push registration');
      return false;
    }

    // Check if running on mobile platform
    if (!Capacitor.isNativePlatform()) {
      console.log('Not running on native platform, skipping mobile push registration');
      return false;
    }

    // Request permissions
    const permissionResult = await PushNotifications.requestPermissions();
    if (permissionResult.receive !== 'granted') {
      console.error('Push notification permission denied');
      await telemetry.mobile.pushRegister({ 
        success: false, 
        reason: 'permission_denied' 
      });
      return false;
    }

    // Register for push notifications
    await PushNotifications.register();

    // Listen for registration token
    PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration success, token:', token.value);
      
      try {
        // Save token to database
        await supabase.from('push_tokens').upsert({
          user_id: user.id,
          token: token.value,
          platform: 'mobile'
        });

        await telemetry.mobile.pushRegister({ 
          success: true, 
          platform: 'mobile' 
        });
      } catch (error) {
        console.error('Error saving push token:', error);
        await telemetry.mobile.pushRegister({ 
          success: false, 
          reason: 'save_failed',
          error: error.message 
        });
      }
    });

    // Listen for registration errors
    PushNotifications.addListener('registrationError', async (error) => {
      console.error('Push registration error:', error);
      await telemetry.mobile.pushRegister({ 
        success: false, 
        reason: 'registration_error',
        error: error.error 
      });
    });

    // Listen for incoming notifications
    PushNotifications.addListener('pushNotificationReceived', async (notification) => {
      console.log('Push notification received:', notification);
      
      await telemetry.notifications.push({ 
        received: true,
        title: notification.title,
        platform: 'mobile'
      });
    });

    // Listen for notification actions
    PushNotifications.addListener('pushNotificationActionPerformed', async (notification) => {
      console.log('Push notification action performed:', notification);
      
      await telemetry.notifications.push({ 
        action_performed: true,
        action_id: notification.actionId,
        platform: 'mobile'
      });

      // Handle notification tap - navigate to relevant screen
      const data = notification.notification.data;
      if (data?.url) {
        // In a real mobile app, you'd use router navigation
        window.location.href = data.url;
      }
    });

    return true;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    await telemetry.mobile.pushRegister({ 
      success: false, 
      reason: 'unexpected_error',
      error: error.message 
    });
    return false;
  }
}

export async function unregisterMobilePush(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    // Remove all listeners
    await PushNotifications.removeAllListeners();

    // Remove tokens from database
    await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('platform', 'mobile');

    await telemetry.mobile.pushRegister({ 
      success: true, 
      action: 'unregister' 
    });

    return true;
  } catch (error) {
    console.error('Error unregistering push notifications:', error);
    return false;
  }
}

export async function sendTestPushNotification(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Call edge function to send test notification
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_ids: [user.id],
        title: 'Test Notification',
        body: 'This is a test push notification from PawPilot HQ!',
        data: { url: '/notifications' }
      }
    });

    if (error) {
      console.error('Error sending test notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending test notification:', error);
    return false;
  }
}