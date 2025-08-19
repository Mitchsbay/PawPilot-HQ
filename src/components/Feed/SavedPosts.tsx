import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { Bookmark, Heart, MessageCircle, Share, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface SavedPost {
  id: string;
  post_id: string;
  created_at: string;
  posts: {
    id: string;
    content: string;
    media_urls: string[];
    created_at: string;
    likes_count: number;
    comments_count: number;
    profiles: {
      display_name: string;
      avatar_url?: string;
    };
  };
}

const SavedPosts: React.FC = () => {
  const { profile } = useAuth();
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      loadSavedPosts();
    }
  }, [profile]);

  const loadSavedPosts = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('saved_posts')
        .select(`
          *,
          posts!inner(
            id,
            content,
            media_urls,
            created_at,
            likes_count,
            comments_count,
            profiles!posts_author_id_fkey(display_name, avatar_url)
          )
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading saved posts:', error);
        toast.error('Failed to load saved posts');
      } else {
        setSavedPosts(data || []);
      }
    } catch (error) {
      console.error('Error loading saved posts:', error);
      toast.error('Failed to load saved posts');
    } finally {
      setLoading(false);
    }
  };

  const unsavePost = async (savedPostId: string) => {
    try {
      const { error } = await supabase
        .from('saved_posts')
        .delete()
        .eq('id', savedPostId);

      if (error) {
        toast.error('Failed to unsave post');
        console.error('Error unsaving post:', error);
      } else {
        toast.success('Post removed from saved');
        loadSavedPosts();
      }
    } catch (error) {
      console.error('Error unsaving post:', error);
      toast.error('Failed to unsave post');
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

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
            <div className="h-20 bg-gray-200 rounded mb-4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Saved Posts</h2>
        <span className="text-sm text-gray-600">{savedPosts.length} saved</span>
      </div>

      {savedPosts.length > 0 ? (
        <div className="space-y-6">
          {savedPosts.map((savedPost, index) => (
            <motion.div
              key={savedPost.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              {/* Post Header */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {savedPost.posts.profiles.avatar_url ? (
                      <img
                        src={savedPost.posts.profiles.avatar_url}
                        alt={savedPost.posts.profiles.display_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <Heart className="h-5 w-5 text-gray-600" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {savedPost.posts.profiles.display_name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatTimeAgo(savedPost.posts.created_at)}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => unsavePost(savedPost.id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                    title="Remove from saved"
                  >
                    <Bookmark className="h-5 w-5 fill-current" />
                  </button>
                </div>

                {/* Post Content */}
                <p className="text-gray-900 mb-4 whitespace-pre-wrap">
                  {savedPost.posts.content}
                </p>
              </div>

              {/* Post Media */}
              {savedPost.posts.media_urls && savedPost.posts.media_urls.length > 0 && (
                <div className="grid grid-cols-1 gap-1">
                  {savedPost.posts.media_urls.map((url, mediaIndex) => (
                    <img
                      key={mediaIndex}
                      src={url}
                      alt="Post media"
                      className="w-full h-auto object-cover"
                    />
                  ))}
                </div>
              )}

              {/* Post Stats */}
              <div className="p-4 border-t border-gray-100">
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Heart className="h-4 w-4" />
                    <span>{savedPost.posts.likes_count}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MessageCircle className="h-4 w-4" />
                    <span>{savedPost.posts.comments_count}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Bookmark className="h-4 w-4" />
                    <span>Saved {formatTimeAgo(savedPost.created_at)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Bookmark className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No saved posts</h3>
          <p className="text-gray-600">
            Posts you save will appear here for easy access later
          </p>
        </div>
      )}
    </div>
  );
};

export default SavedPosts;