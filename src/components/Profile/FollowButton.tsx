import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { UserPlus, UserMinus, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface FollowButtonProps {
  userId: string;
  userName: string;
  isFollowing: boolean;
  onFollowChange: (isFollowing: boolean) => void;
  className?: string;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  userId,
  userName,
  isFollowing,
  onFollowChange,
  className = ''
}) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleFollow = async () => {
    if (!profile || userId === profile.id) return;

    setLoading(true);

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', profile.id)
          .eq('following_id', userId);

        if (error) {
          toast.error('Failed to unfollow user');
          console.error('Error unfollowing:', error);
        } else {
          onFollowChange(false);
          toast.success(`Unfollowed ${userName}`);
        }
      } else {
        // Follow
        const { error } = await supabase
          .from('user_follows')
          .insert({
            follower_id: profile.id,
            following_id: userId
          });

        if (error) {
          toast.error('Failed to follow user');
          console.error('Error following:', error);
        } else {
          onFollowChange(true);
          toast.success(`Now following ${userName}`);
        }
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
      toast.error('Failed to update follow status');
    } finally {
      setLoading(false);
    }
  };

  if (userId === profile?.id) {
    return null; // Don't show follow button for own profile
  }

  return (
    <button
      onClick={handleFollow}
      disabled={loading}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        isFollowing
          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      } ${className}`}
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          <span>Loading...</span>
        </>
      ) : isFollowing ? (
        <>
          <Check className="h-4 w-4" />
          <span>Following</span>
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" />
          <span>Follow</span>
        </>
      )}
    </button>
  );
};

export default FollowButton;