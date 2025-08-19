import React, { useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import toast from 'react-hot-toast';

const PushNotificationManager: React.FC = () => {
  const { profile } = useAuth();
  const { isSupported, isSubscribed, subscribeToPush } = usePushNotifications();

  useEffect(() => {
    if (!profile || !isSupported) return;

    // Auto-subscribe to push notifications for new users
    const hasAskedBefore = localStorage.getItem(`push-permission-asked-${profile.id}`);
    
    if (!hasAskedBefore && !isSubscribed) {
      // Wait a bit before asking for permission
      const timer = setTimeout(() => {
        if (Notification.permission === 'default') {
          toast((t) => (
            <div className="flex items-center space-x-3">
              <div>
                <p className="font-medium text-gray-900">Enable notifications?</p>
                <p className="text-sm text-gray-600">Stay updated with likes, comments, and messages</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    subscribeToPush();
                    toast.dismiss(t.id);
                  }}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Enable
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem(`push-permission-asked-${profile.id}`, 'true');
                    toast.dismiss(t.id);
                  }}
                  className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400"
                >
                  Later
                </button>
              </div>
            </div>
          ), {
            duration: 10000,
            position: 'top-center'
          });
        }
        localStorage.setItem(`push-permission-asked-${profile.id}`, 'true');
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [profile, isSupported, isSubscribed, subscribeToPush]);

  // Listen for notification permission changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && Notification.permission === 'granted' && !isSubscribed) {
        subscribeToPush();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isSubscribed, subscribeToPush]);

  return null; // This is a service component
};

export default PushNotificationManager;