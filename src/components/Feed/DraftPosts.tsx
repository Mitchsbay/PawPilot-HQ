import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { Edit, Trash2, Send, Calendar, Clock, Globe, Users, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import ConfirmDialog from '../UI/ConfirmDialog';

interface ScheduledPost {
  id: string;
  content: string;
  visibility: 'public' | 'friends' | 'private';
  pet_id?: string;
  scheduled_for?: string;
  is_draft: boolean;
  status: 'draft' | 'scheduled' | 'published';
  created_at: string;
  pets?: {
    name: string;
    species: string;
  };
}

const DraftPosts: React.FC = () => {
  const { profile } = useAuth();
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingPost, setDeletingPost] = useState<ScheduledPost | null>(null);
  const [activeTab, setActiveTab] = useState<'drafts' | 'scheduled'>('drafts');

  useEffect(() => {
    if (profile) {
      loadScheduledPosts();
    }
  }, [profile, activeTab]);

  const loadScheduledPosts = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select(`
          *,
          pets(name, species)
        `)
        .eq('author_id', profile.id)
        .eq('is_draft', activeTab === 'drafts')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading scheduled posts:', error);
        toast.error('Failed to load posts');
      } else {
        setScheduledPosts(data || []);
      }
    } catch (error) {
      console.error('Error loading scheduled posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const publishNow = async (post: ScheduledPost) => {
    try {
      // Create the actual post
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          author_id: profile?.id,
          content: post.content,
          visibility: post.visibility,
          pet_id: post.pet_id,
          likes_count: 0,
          comments_count: 0,
          shares_count: 0
        });

      if (postError) {
        toast.error('Failed to publish post');
        console.error('Error publishing post:', postError);
        return;
      }

      // Update scheduled post status
      const { error: updateError } = await supabase
        .from('scheduled_posts')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('id', post.id);

      if (updateError) {
        console.error('Error updating scheduled post:', updateError);
      }

      toast.success('Post published successfully!');
      loadScheduledPosts();
    } catch (error) {
      console.error('Error publishing post:', error);
      toast.error('Failed to publish post');
    }
  };

  const deletePost = async () => {
    if (!deletingPost) return;

    try {
      const { error } = await supabase
        .from('scheduled_posts')
        .delete()
        .eq('id', deletingPost.id);

      if (error) {
        toast.error('Failed to delete post');
        console.error('Error deleting post:', error);
      } else {
        toast.success(`${deletingPost.is_draft ? 'Draft' : 'Scheduled post'} deleted`);
        loadScheduledPosts();
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    } finally {
      setDeletingPost(null);
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public': return Globe;
      case 'friends': return Users;
      case 'private': return Lock;
      default: return Globe;
    }
  };

  const formatScheduledTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 24) {
      return `in ${diffInHours} hour${diffInHours !== 1 ? 's' : ''}`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `in ${diffInDays} day${diffInDays !== 1 ? 's' : ''}`;
    }
  };

  const filteredPosts = scheduledPosts.filter(post => 
    activeTab === 'drafts' ? post.is_draft : !post.is_draft
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Content Manager</h2>
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('drafts')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'drafts'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Drafts
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'scheduled'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Scheduled
          </button>
        </div>
      </div>

      {/* Posts List */}
      {filteredPosts.length > 0 ? (
        <div className="space-y-4">
          {filteredPosts.map((post, index) => {
            const VisibilityIcon = getVisibilityIcon(post.visibility);
            
            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <VisibilityIcon className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-500 capitalize">{post.visibility}</span>
                      {post.pets && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="text-sm text-gray-500">with {post.pets.name}</span>
                        </>
                      )}
                    </div>
                    <p className="text-gray-900 whitespace-pre-wrap">{post.content}</p>
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    {!post.is_draft && (
                      <button
                        onClick={() => publishNow(post)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                        title="Publish now"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setDeletingPost(post)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Schedule Info */}
                <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-4">
                    {post.is_draft ? (
                      <div className="flex items-center space-x-1">
                        <Edit className="h-4 w-4" />
                        <span>Draft saved {new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>
                          Scheduled for {new Date(post.scheduled_for!).toLocaleString()}
                          {new Date(post.scheduled_for!) > new Date() && (
                            <span className="text-blue-600 ml-1">
                              ({formatScheduledTime(post.scheduled_for!)})
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    post.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                    post.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {post.status}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          {activeTab === 'drafts' ? (
            <>
              <Edit className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No drafts</h3>
              <p className="text-gray-600">
                Draft posts will appear here for you to edit and publish later
              </p>
            </>
          ) : (
            <>
              <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No scheduled posts</h3>
              <p className="text-gray-600">
                Posts scheduled for future publishing will appear here
              </p>
            </>
          )}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingPost}
        onClose={() => setDeletingPost(null)}
        onConfirm={deletePost}
        title={`Delete ${deletingPost?.is_draft ? 'Draft' : 'Scheduled Post'}`}
        message={`Are you sure you want to delete this ${deletingPost?.is_draft ? 'draft' : 'scheduled post'}? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
};

export default DraftPosts;