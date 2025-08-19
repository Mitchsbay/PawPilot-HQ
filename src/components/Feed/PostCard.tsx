import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { Heart, MessageCircle, Share, Globe, Users, Lock, User, Tag } from 'lucide-react';
import { motion } from 'framer-motion';
import PostActions from './PostActions';
import PostComments from './PostComments';

interface PostCardProps {
  post: {
    id: string;
    author_id: string;
    content: string;
    media_urls: string[];
    visibility: 'public' | 'friends' | 'private';
    likes_count: number;
    comments_count: number;
    shares_count: number;
    created_at: string;
    profiles: {
      id: string;
      display_name: string;
      avatar_url?: string;
    };
    pets?: {
      id: string;
      name: string;
      species: string;
    };
    user_liked?: boolean;
  };
  onLike: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  onBlock?: () => void;
  index?: number;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  onLike,
  onEdit,
  onDelete,
  onReport,
  onBlock,
  index = 0
}) => {
  const { profile } = useAuth();
  const [showComments, setShowComments] = useState(false);

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public': return Globe;
      case 'friends': return Users;
      case 'private': return Lock;
      default: return Globe;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  const VisibilityIcon = getVisibilityIcon(post.visibility);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="bg-white rounded-lg shadow-md overflow-hidden"
      >
        {/* Post Header */}
        <div className="p-4">
          <div className="flex items-center space-x-3 mb-4">
            {post.profiles.avatar_url ? (
              <img
                src={post.profiles.avatar_url}
                alt={post.profiles.display_name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-gray-600" />
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{post.profiles.display_name}</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>{formatTimeAgo(post.created_at)}</span>
                <VisibilityIcon className="h-3 w-3" />
                {post.pets && (
                  <>
                    <span>•</span>
                    <div className="flex items-center space-x-1">
                      <Tag className="h-3 w-3" />
                      <span>with {post.pets.name}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Post Content */}
          {post.content && (
            <p className="text-gray-900 mb-4 whitespace-pre-wrap">{post.content}</p>
          )}
        </div>

        {/* Post Media */}
        {post.media_urls && post.media_urls.length > 0 && (
          <div className="grid grid-cols-1 gap-1">
            {post.media_urls.map((url, mediaIndex) => (
              <img
                key={mediaIndex}
                src={url}
                alt="Post media"
                className="w-full h-auto object-cover"
              />
            ))}
          </div>
        )}

        {/* Post Actions */}
        <PostActions
          post={post}
          onLike={onLike}
          onComment={() => setShowComments(true)}
          onEdit={onEdit}
          onDelete={onDelete}
          onReport={onReport}
          onBlock={onBlock}
        />
      </motion.div>

      {/* Comments Modal */}
      <PostComments
        postId={post.id}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        initialCommentsCount={post.comments_count}
      />
    </>
  );
};

export default PostCard;