import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

export function useTypingIndicator(conversationId: string) {
  const { profile } = useAuth();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!conversationId || !profile) return;

    // Create a presence channel for typing indicators
    const channel = supabase.channel(`typing:${conversationId}`, {
      config: { 
        presence: { key: profile.id },
        broadcast: { self: true }
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.keys(state)
          .filter((id) => id !== profile.id && state[id]?.[0]?.typing)
          .map(id => state[id]?.[0]?.display_name || id);
        setTypingUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key !== profile.id && newPresences?.[0]?.typing) {
          setTypingUsers(prev => [...new Set([...prev, newPresences[0].display_name || key])]);
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key !== profile.id) {
          setTypingUsers(prev => prev.filter(user => user !== key));
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ 
            typing: false, 
            display_name: profile.display_name,
            user_id: profile.id 
          });
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, profile]);

  // Call this to mark yourself as typing
  const handleTyping = async () => {
    if (!channelRef.current || !profile) return;
    
    try {
      await channelRef.current.track({ 
        typing: true, 
        display_name: profile.display_name,
        user_id: profile.id 
      });
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  };

  // Call this to mark yourself as not typing
  const stopTyping = async () => {
    if (!channelRef.current || !profile) return;
    
    try {
      await channelRef.current.track({ 
        typing: false, 
        display_name: profile.display_name,
        user_id: profile.id 
      });
    } catch (error) {
      console.error('Error stopping typing status:', error);
    }
  };

  // Auto-stop typing after inactivity
  const debouncedStopTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 1200);
  };

  return { 
    typingUsers, 
    handleTyping, 
    stopTyping, 
    debouncedStopTyping 
  };
}