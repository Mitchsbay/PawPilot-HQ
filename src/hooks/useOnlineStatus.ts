import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

type PresenceStatus = 'online' | 'away' | 'offline';

interface UserPresence {
  user_id: string;
  status: PresenceStatus;
  last_seen_at: string;
}

export const useOnlineStatus = (userId?: string) => {
  const { profile } = useAuth();
  const [status, setStatus] = useState<PresenceStatus>('offline');
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Load initial presence status
    const loadPresence = async () => {
      try {
        const { data, error } = await supabase
          .from('user_presence')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading presence:', error);
          return;
        }

        if (data) {
          setStatus(data.status as PresenceStatus);
          setLastSeen(data.last_seen_at);
        }
      } catch (error) {
        console.error('Error loading presence:', error);
      }
    };

    loadPresence();

    // Subscribe to presence changes
    const channel = supabase
      .channel(`presence:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_presence',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        if (payload.new) {
          setStatus(payload.new.status as PresenceStatus);
          setLastSeen(payload.new.last_seen_at);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Update own presence status
  const updateStatus = async (newStatus: PresenceStatus) => {
    if (!profile || userId !== profile.id) return;

    try {
      const { error } = await supabase.functions.invoke('presence-heartbeat', {
        body: { status: newStatus }
      });

      if (error) {
        console.error('Error updating presence:', error);
      }
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  };

  // Auto-update presence based on page visibility
  useEffect(() => {
    if (!profile || userId !== profile.id) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateStatus('away');
      } else {
        updateStatus('online');
      }
    };

    const handleBeforeUnload = () => {
      updateStatus('offline');
    };

    // Set initial status
    updateStatus('online');

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
      if (!document.hidden) {
        updateStatus('online');
      }
    }, 30000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(heartbeat);
      updateStatus('offline');
    };
  }, [profile, userId]);

  return { status, lastSeen, updateStatus };
};