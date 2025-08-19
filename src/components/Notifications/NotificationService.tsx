import React, { useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import toast from 'react-hot-toast';

const NotificationService: React.FC = () => {
  const { profile } = useAuth();
  const { isSupported, isSubscribed } = usePushNotifications();

  useEffect(() => {
    if (!profile) return;

    // Subscribe to real-time notifications
    const channel = supabase
      .channel('user-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${profile.id}`
      }, (payload) => {
        const notification = payload.new;
        
        // Show toast notification
        toast(notification.message, {
          icon: getNotificationIcon(notification.type),
          duration: 4000,
        });

        // Send push notification if subscribed and supported
        if (isSubscribed && isSupported && 'serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(notification.title, {
              body: notification.message,
              icon: '/vite.svg',
              badge: '/vite.svg',
              tag: notification.type,
              data: {
                url: getNotificationUrl(notification),
                notificationId: notification.id
              },
              actions: [
                {
                  action: 'view',
                  title: 'View'
                },
                {
                  action: 'dismiss',
                  title: 'Dismiss'
                }
              ]
            });
          }).catch(error => {
            console.error('Error showing notification:', error);
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, isSubscribed, isSupported]);

  // Auto-subscribe to push notifications on first visit
  useEffect(() => {
    if (profile && isSupported && !isSubscribed) {
      const hasAskedBefore = localStorage.getItem('push-permission-asked');
      if (!hasAskedBefore) {
        setTimeout(() => {
          if (Notification.permission === 'default') {
            toast('Enable notifications to stay updated!', {
              duration: 6000,
              icon: '🔔',
              action: {
                label: 'Enable',
                onClick: () => {
                  // This would trigger the push subscription flow
                  window.location.href = '/settings?tab=notifications';
                }
              }
            });
          }
          localStorage.setItem('push-permission-asked', 'true');
        }, 3000);
      }
    }
  }, [profile, isSupported, isSubscribed]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like': return '❤️';
      case 'comment': return '💬';
      case 'follow': return '👥';
      case 'message': return '📩';
      case 'event': return '📅';
      case 'lost_found': return '🚨';
      case 'group_invite': return '👥';
      default: return '🔔';
    }
  };

  const getNotificationUrl = (notification: any) => {
    switch (notification.type) {
      case 'like':
      case 'comment':
        return `/feed#post-${notification.related_id}`;
      case 'message':
        return '/messages';
      case 'follow':
        return `/profile/${notification.from_user_id}`;
      case 'event':
        return `/events#event-${notification.related_id}`;
      case 'lost_found':
        return `/lostfound#report-${notification.related_id}`;
      case 'group_invite':
        return `/groups#group-${notification.related_id}`;
      default:
        return '/notifications';
    }
  };

  return null; // This is a service component, no UI
};

export default NotificationService;