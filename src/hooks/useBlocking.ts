import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { firstRow } from '../lib/firstRow';
import toast from 'react-hot-toast';

interface BlockedUser {
  id: string;
  blocked_user_id: string;
  created_at: string;
  profiles: {
    display_name: string;
    avatar_url?: string;
  };
}

export const useBlocking = () => {
  const { profile } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      loadBlockedUsers();
    }
  }, [profile]);

  const loadBlockedUsers = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('user_blocks')
        .select(`
          *,
          profiles!user_blocks_blocked_user_id_fkey(display_name, avatar_url)
        `)
        .eq('blocker_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading blocked users:', error);
      } else {
        setBlockedUsers(data || []);
      }
    } catch (error) {
      console.error('Error loading blocked users:', error);
    }
  };

  const blockUser = async (userId: string) => {
    if (!profile || userId === profile.id) return;

    setLoading(true);

    try {
      // Check if already blocked
      const { data: existingBlock } = await supabase
        .from('user_blocks')
        .select('id')
        .eq('blocker_id', profile.id)
        .eq('blocked_user_id', userId)
        .limit(1);

      const blockRecord = firstRow(existingBlock);
      if (blockRecord) {
        toast.error('User is already blocked');
        setLoading(false);
        return;
      }

      // Create block record
      const { error: blockError } = await supabase
        .from('user_blocks')
        .insert({
          blocker_id: profile.id,
          blocked_user_id: userId
        });

      if (blockError) {
        toast.error('Failed to block user');
        console.error('Error blocking user:', blockError);
        setLoading(false);
        return;
      }

      // Remove any existing follow relationships
      await supabase
        .from('user_follows')
        .delete()
        .or(`and(follower_id.eq.${profile.id},following_id.eq.${userId}),and(follower_id.eq.${userId},following_id.eq.${profile.id})`);

      toast.success('User blocked successfully');
      loadBlockedUsers();
    } catch (error) {
      console.error('Error blocking user:', error);
      toast.error('Failed to block user');
    } finally {
      setLoading(false);
    }
  };

  const unblockUser = async (userId: string) => {
    if (!profile) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', profile.id)
        .eq('blocked_user_id', userId);

      if (error) {
        toast.error('Failed to unblock user');
        console.error('Error unblocking user:', error);
      } else {
        toast.success('User unblocked successfully');
        loadBlockedUsers();
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast.error('Failed to unblock user');
    } finally {
      setLoading(false);
    }
  };

  const isUserBlocked = async (userId: string): Promise<boolean> => {
    if (!profile) return false;

    try {
      const { data, error } = await supabase
        .from('user_blocks')
        .select('id')
        .eq('blocker_id', profile.id)
        .eq('blocked_user_id', userId)
        .limit(1);

      const blockRecord = firstRow(data);
      return !!blockRecord && !error;
    } catch (error) {
      return false;
    }
  };

  return {
    blockedUsers,
    loading,
    blockUser,
    unblockUser,
    isUserBlocked,
    loadBlockedUsers
  };
};
