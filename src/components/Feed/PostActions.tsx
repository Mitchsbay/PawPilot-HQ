import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { firstRow } from '../../lib/firstRow';
import { Heart, MessageCircle, Share, Bookmark, MoreHorizontal, Edit, Trash2, Flag, UserX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import SocialShare from '../Sharing/SocialShare';

interface PostActionsProps {
  post: {
    id: string;
    author_id: string;
    content: string;
    likes_count: number;
    comments_count: number;
    shares_count: number;
    user_liked?: boolean;
    profiles: {
      display_name: string;
      avatar_url?: string;
    };
  };
  onLike: () => void;
  onComment: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  onBlock?: () => void;
}

const PostActions: React.FC<PostActionsProps> = ({
  post,
  onLike,
  onComment,
  onEdit,
  onDelete,
  onReport,
  onBlock
}) => {
  const { profile } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const isOwnPost = post.author_id === profile?.id;

  const handleSavePost = async () => {
    if (!profile) return;

    setSaving(true);

    try {
      // Check if already saved
      const { data: existingSave } = await supabase
        .from('saved_posts')
        .select('id')
        .eq('user_id', profile.id)
        .eq('post_id', post.id)
        .limit(1);

      const saveRecord = firstRow(existingSave);
      if (saveRecord) {
        // Unsave
        const { error } = await supabase
          .from('saved_posts')
          .delete()
          .eq('id', saveRecord.id);

        if (!error) {
          toast.success('Post removed from saved');
        }
      } else {
        // Save
        const { error } = await supabase
          .from('saved_posts')
          .insert({
            user_id: profile.id,
            post_id: post.id
          });

        if (!error) {
          toast.success('Post saved!');
        }
      }
    } catch (error) {
      console.error('Error saving post:', error);
      toast.error('Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    // Update share count
    await supabase
      .from('posts')
      .update({ shares_count: post.shares_count + 1 })
      .eq('id', post.id);

    setShowShareModal(true);
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 border-t border-gray-100">
        <div className="flex items-center space-x-6">
          <button
            onClick={onLike}
            className={`flex items-center space-x-2 transition-colors ${
              post.user_liked 
                ? 'text-red-600' 
                : 'text-gray-600 hover:text-red-600'
            }`}
          >
            <Heart className={`h-5 w-5 ${post.user_liked ? 'fill-current' : ''}`} />
            <span className="text-sm font-medium">{post.likes_count}</span>
          </button>

          <button
            onClick={onComment}
            className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm font-medium">{post.comments_count}</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center space-x-2 text-gray-600 hover:text-green-600 transition-colors"
          >
            <Share className="h-5 w-5" />
            <span className="text-sm font-medium">{post.shares_count}</span>
          </button>

          <button
            onClick={handleSavePost}
            disabled={saving}
            className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 transition-colors disabled:opacity-50"
          >
            <Bookmark className="h-5 w-5" />
          </button>
        </div>

        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <MoreHorizontal className="h-4 w-4 text-gray-600" />
          </button>
          
          {/* Post Menu */}
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10"
              >
                {isOwnPost ? (
                  <>
                    <button
                      onClick={() => {
                        onEdit?.();
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Post
                    </button>
                    <button
                      onClick={() => {
                        onDelete?.();
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Post
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        handleSavePost();
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Bookmark className="h-4 w-4 mr-2" />
                      Save Post
                    </button>
                    <button
                      onClick={() => {
                        onReport?.();
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Flag className="h-4 w-4 mr-2" />
                      Report Post
                    </button>
                    <button
                      onClick={() => {
                        onBlock?.();
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      Block User
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Social Share Modal */}
      <SocialShare
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        content={{
          title: `${post.profiles.display_name}'s post`,
          description: post.content,
          url: `${window.location.origin}/feed#post-${post.id}`,
          imageUrl: undefined
        }}
      />
    </>
  );
};

export default PostActions;
