import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { firstRow } from '@/lib/firstRow';
import toast from 'react-hot-toast';

interface EmailPreferences {
  daily_digest: boolean;
  weekly_summary: boolean;
  new_followers: boolean;
  post_interactions: boolean;
  messages: boolean;
  events: boolean;
  lost_found_alerts: boolean;
  group_activity: boolean;
}

export const useEmailNotifications = () => {
  const { profile } = useAuth();
  const [preferences, setPreferences] = useState<EmailPreferences>({
    daily_digest: true,
    weekly_summary: true,
    new_followers: true,
    post_interactions: false,
    messages: true,
    events: true,
    lost_found_alerts: true,
    group_activity: false
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      loadEmailPreferences();
    }
  }, [profile]);

  const loadEmailPreferences = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('email_preferences')
        .select('*')
        .eq('user_id', profile.id)
        .limit(1);

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading email preferences:', error);
      } else {
        const preferences = firstRow(data);
        if (preferences) {
          setPreferences(preferences);
        }
      }
    } catch (error) {
      console.error('Error loading email preferences:', error);
    }
  };

  const updateEmailPreferences = async (newPreferences: Partial<EmailPreferences>) => {
    if (!profile) return;

    setLoading(true);

    try {
      const updatedPreferences = { ...preferences, ...newPreferences };
      
      const { error } = await supabase
        .from('email_preferences')
        .upsert({
          user_id: profile.id,
          ...updatedPreferences,
          updated_at: new Date().toISOString()
        });

      if (error) {
        toast.error('Failed to update email preferences');
        console.error('Error updating email preferences:', error);
      } else {
        setPreferences(updatedPreferences);
        toast.success('Email preferences updated!');
      }
    } catch (error) {
      console.error('Error updating email preferences:', error);
      toast.error('Failed to update email preferences');
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async () => {
    if (!profile) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-email-notifications', {
        body: {
          notifications: [{
            to: profile.email,
            subject: 'PawPilot HQ - Test Email',
            html: `
              <h2>Hello ${profile.display_name}!</h2>
              <p>This is a test email to confirm your email notifications are working properly.</p>
              <p>You're receiving this because you requested a test email from your PawPilot HQ settings.</p>
              <br>
              <p>Best regards,<br>The PawPilot HQ Team</p>
            `,
            type: 'alert'
          }]
        }
      });

      if (error) {
        toast.error('Failed to send test email');
        console.error('Error sending test email:', error);
      } else {
        toast.success('Test email sent! Check your inbox.');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error('Failed to send test email');
    } finally {
      setLoading(false);
    }
  };

  return {
    preferences,
    loading,
    updateEmailPreferences,
    sendTestEmail
  };
};
