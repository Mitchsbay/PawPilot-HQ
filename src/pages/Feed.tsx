import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase, Pet, Post } from '../lib/supabase';
import { BUCKETS } from '../lib/buckets';
import { uploadFileSecure } from '../lib/storage';
import { 
  Heart, MessageCircle, Share, Plus, Camera, X, Send, 
  MoreHorizontal, Edit, Trash2, Flag, Globe, Users, UserX, Bookmark,
  Lock, Image, Video, Smile, MapPin, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/UI/ConfirmDialog';
import ReportModal from '../components/Moderation/ReportModal';
import BlockUserModal from '../components/Moderation/BlockUserModal';
import PostCard from '../components/Feed/PostCard';
import PostEditor from '../components/Feed/PostEditor';
import PostScheduler from '../components/Feed/PostScheduler';
import SocialShare from '../components/Sharing/SocialShare';
import MediaUploader from '../components/Feed/MediaUploader';
import FeedFilters from '../components/Feed/FeedFilters';

interface PostWithDetails extends Post {
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
  comments?: Array<{
    id: string;
    content: string;
    created_at: string;
    author_id: string;
    profiles: {
      display_name: string;
      avatar_url?: string;
    };
  }>;
}

const Feed: React.FC = () => {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<PostWithDetails[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingPost, setDeletingPost] = useState<PostWithDetails | null>(null);
  const [reportingPost, setReportingPost] = useState<PostWithDetails | null>(null);
  const [blockingUser, setBlockingUser] = useState<{ id: string; name: string; avatar?: string } | null>(null);
  const [editingPost, setEditingPost] = useState<PostWithDetails | null>(null);
  const [showPostMenu, setShowPostMenu] = useState<string | null>(null);
  const [showScheduler, setShowScheduler] = useState(false);
  const [sharingPost, setSharingPost] = useState<PostWithDetails | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'following'>('recent');
  const [showFollowingOnly, setShowFollowingOnly] = useState(false);

  // Create post form
  const [postData, setPostData] = useState({
    content: '',
    visibility: 'public' as 'public' | 'friends' | 'private',
    pet_id: ''
  });
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Comments
  const [showComments, setShowComments] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [profile]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'post') {
      setShowCreateModal(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const loadData = async () => {
    if (!profile) return;

    try {
      // Load user's pets for post creation
      const { data: petsData, error: petsError } = await supabase
        .from('pets')
        .select('*')
        .eq('owner_id', profile.id)
        .order('name');

      if (petsError) {
        console.error('Error loading pets:', petsError);
      } else {
        setPets(petsData || []);
      }

      // Load posts from feed
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_author_id_fkey(id, display_name, avatar_url),
          pets(id, name, species)
        `)
        .or(`visibility.eq.public,and(visibility.eq.friends,author_id.in.(${await getFriendIds()}))`)
        .order(sortBy === 'popular' ? 'likes_count' : 'created_at', { ascending: false })
        .limit(20);

      if (postsError) {
        console.error('Error loading posts:', postsError);
        toast.error('Failed to load posts');
      } else {
        // Check which posts the user has liked
        const postsWithLikes = await Promise.all(
          (postsData || []).map(async (post) => {
            const { data: likeData } = await supabase
              .from('post_likes')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', profile.id)
              .single();

            return {
              ...post,
              user_liked: !!likeData
            };
          })
        );

        setPosts(postsWithLikes);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  const getFriendIds = async () => {
    if (!profile) return '';
    
    const { data } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', profile.id);
    
    return data?.map(f => f.following_id).join(',') || '';
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (mediaFiles.length + files.length > 5) {
      toast.error('Maximum 5 media files allowed');
      return;
    }

    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    setMediaFiles(prev => [...prev, ...validFiles]);

    // Generate previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!postData.content.trim() && mediaFiles.length === 0) {
      toast.error('Please add some content or media');
      return;
    }

    setSubmitting(true);

    try {
      // Upload media files
      const mediaUrls: string[] = [];
      for (const file of mediaFiles) {
        const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${file.name}`;
        const mediaUrl = await uploadFileSecure('postMedia', filename, file);
        if (mediaUrl) {
          mediaUrls.push(mediaUrl);
        }
      }

      const newPost = {
        author_id: profile.id,
        content: postData.content.trim(),
        media_urls: mediaUrls,
        visibility: postData.visibility,
        pet_id: postData.pet_id || null,
        likes_count: 0,
        comments_count: 0,
        shares_count: 0
      };

      const { error } = await supabase
        .from('posts')
        .insert(newPost);

      if (error) {
        toast.error('Failed to create post');
        console.error('Error creating post:', error);
      } else {
        toast.success('Post created successfully!');
        setShowCreateModal(false);
        resetCreateForm();
        loadData();
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setPostData({
      content: '',
      visibility: 'public',
      pet_id: ''
    });
    setMediaFiles([]);
    setMediaPreviews([]);
  };

  const handleLike = async (post: PostWithDetails) => {
    if (!profile) return;

    try {
      if (post.user_liked) {
        // Unlike
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', profile.id);

        if (!error) {
          // Update local state
          setPosts(prev => prev.map(p => 
            p.id === post.id 
              ? { ...p, user_liked: false, likes_count: p.likes_count - 1 }
              : p
          ));

          // Update post likes count
          await supabase
            .from('posts')
            .update({ likes_count: post.likes_count - 1 })
            .eq('id', post.id);
        }
      } else {
        // Like
        const { error } = await supabase
          .from('post_likes')
          .insert({
            post_id: post.id,
            user_id: profile.id
          });

        if (!error) {
          // Update local state
          setPosts(prev => prev.map(p => 
            p.id === post.id 
              ? { ...p, user_liked: true, likes_count: p.likes_count + 1 }
              : p
          ));

          // Update post likes count
          await supabase
            .from('posts')
            .update({ likes_count: post.likes_count + 1 })
            .eq('id', post.id);
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  const loadComments = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          *,
          profiles!post_comments_author_id_fkey(display_name, avatar_url)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading comments:', error);
      } else {
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, comments: data || [] }
            : post
        ));
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleComment = async (postId: string) => {
    if (!profile || !commentText.trim()) return;

    setSubmittingComment(true);

    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          author_id: profile.id,
          content: commentText.trim()
        });

      if (error) {
        toast.error('Failed to add comment');
        console.error('Error adding comment:', error);
      } else {
        setCommentText('');
        loadComments(postId);
        
        // Update comments count
        const post = posts.find(p => p.id === postId);
        if (post) {
          await supabase
            .from('posts')
            .update({ comments_count: post.comments_count + 1 })
            .eq('id', postId);
          
          setPosts(prev => prev.map(p => 
            p.id === postId 
              ? { ...p, comments_count: p.comments_count + 1 }
              : p
          ));
        }
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeletePost = async () => {
    if (!deletingPost) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', deletingPost.id);

      if (error) {
        toast.error('Failed to delete post');
        console.error('Error deleting post:', error);
      } else {
        toast.success('Post deleted successfully');
        loadData();
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    } finally {
      setDeletingPost(null);
    }
  };

  const handleSavePost = async (post: PostWithDetails) => {
    if (!profile) return;

    try {
      // Check if already saved
      const { data: existingSave } = await supabase
        .from('saved_posts')
        .select('id')
        .eq('user_id', profile.id)
        .eq('post_id', post.id)
        .single();

      if (existingSave) {
        // Unsave
        const { error } = await supabase
          .from('saved_posts')
          .delete()
          .eq('id', existingSave.id);

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
    }
  };

  const handleShare = async (post: PostWithDetails) => {
    setSharingPost(post);
    
    // Update share count
    await supabase
      .from('posts')
      .update({ shares_count: post.shares_count + 1 })
      .eq('id', post.id);

    setPosts(prev => prev.map(p => 
      p.id === post.id 
        ? { ...p, shares_count: p.shares_count + 1 }
        : p
    ));
  };

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

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
              <div className="h-20 bg-gray-200 rounded mb-4"></div>
              <div className="flex space-x-4">
                <div className="h-8 bg-gray-200 rounded w-16"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Create Post Button */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="space-y-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <Camera className="h-5 w-5 text-gray-600" />
              </div>
            )}
            <span className="text-gray-600">What's on your mind, {profile?.display_name}?</span>
          </button>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Post Now
            </button>
            <button
              onClick={() => setShowScheduler(true)}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Schedule Post
            </button>
          </div>
        </div>
      </div>

      {/* Feed Filters */}
      <FeedFilters
        sortBy={sortBy}
        onSortChange={setSortBy}
        showFollowingOnly={showFollowingOnly}
        onFollowingToggle={setShowFollowingOnly}
        className="mb-6"
      />

      {/* Posts Feed */}
      <div className="space-y-6">
        {posts.length > 0 ? (
          posts.map((post, index) => (
            <PostCard
              key={post.id}
              post={post}
              index={index}
              onLike={() => handleLike(post)}
              onEdit={() => setEditingPost(post)}
              onDelete={() => setDeletingPost(post)}
              onReport={() => setReportingPost(post)}
              onBlock={() => setBlockingUser({
                id: post.author_id,
                name: post.profiles.display_name,
                avatar: post.profiles.avatar_url
              })}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <Camera className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No posts yet</h3>
            <p className="text-gray-600 mb-6">
              Be the first to share something with the community!
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Create Your First Post</span>
            </button>
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-full p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
                className="fixed inset-0 bg-black bg-opacity-50"
              />

              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Create Post</h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetCreateForm();
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleCreatePost} className="p-4 space-y-4">
                  {/* User Info */}
                  <div className="flex items-center space-x-3">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.display_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <Camera className="h-5 w-5 text-gray-600" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium text-gray-900">{profile?.display_name}</h3>
                      <select
                        value={postData.visibility}
                        onChange={(e) => setPostData(prev => ({ ...prev, visibility: e.target.value as any }))}
                        className="text-sm text-gray-600 border-none focus:ring-0 p-0"
                      >
                        <option value="public">🌍 Public</option>
                        <option value="friends">👥 Friends</option>
                        <option value="private">🔒 Private</option>
                      </select>
                    </div>
                  </div>

                  {/* Content */}
                  <textarea
                    value={postData.content}
                    onChange={(e) => setPostData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="What's on your mind?"
                    rows={4}
                    className="w-full border-none resize-none focus:ring-0 text-lg placeholder-gray-500"
                  />

                  {/* Pet Selection */}
                  {pets.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tag a pet (optional)
                      </label>
                      <select
                        value={postData.pet_id}
                        onChange={(e) => setPostData(prev => ({ ...prev, pet_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">No pet tagged</option>
                        {pets.map(pet => (
                          <option key={pet.id} value={pet.id}>{pet.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Media Previews */}
                  {mediaPreviews.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {mediaPreviews.map((preview, index) => (
                        <div key={index} className="relative">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeMedia(index)}
                            className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Media Upload */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex space-x-2">
                      <label className="cursor-pointer p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <Image className="h-5 w-5" />
                        <input
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          onChange={handleMediaUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || (!postData.content.trim() && mediaFiles.length === 0)}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Posting...</span>
                        </>
                      ) : (
                        <span>Post</span>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Post Editor Modal */}
      {editingPost && (
        <PostEditor
          isOpen={!!editingPost}
          onClose={() => setEditingPost(null)}
          post={editingPost}
          pets={pets}
          onUpdate={loadData}
        />
      )}

      {/* Post Scheduler Modal */}
      <PostScheduler
        isOpen={showScheduler}
        onClose={() => setShowScheduler(false)}
        pets={pets}
        onScheduled={loadData}
      />

      {/* Social Share Modal */}
      {sharingPost && (
        <SocialShare
          isOpen={!!sharingPost}
          onClose={() => setSharingPost(null)}
          content={{
            title: `${sharingPost.profiles.display_name}'s post`,
            description: sharingPost.content,
            url: `${window.location.origin}/feed#post-${sharingPost.id}`,
            imageUrl: sharingPost.media_urls?.[0]
          }}
        />
      )}

      {/* Delete Post Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingPost}
        onClose={() => setDeletingPost(null)}
        onConfirm={handleDeletePost}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmText="Delete Post"
        type="danger"
      />

      {/* Report Post Modal */}
      {reportingPost && (
        <ReportModal
          isOpen={!!reportingPost}
          onClose={() => setReportingPost(null)}
          contentType="post"
          contentId={reportingPost.id}
          reportedUserId={reportingPost.author_id}
          contentTitle={reportingPost.content.substring(0, 50) + '...'}
        />
      )}

      {/* Block User Modal */}
      {blockingUser && (
        <BlockUserModal
          isOpen={!!blockingUser}
          onClose={() => setBlockingUser(null)}
          userId={blockingUser.id}
          userName={blockingUser.name}
          userAvatar={blockingUser.avatar}
        />
      )}
    </div>
  );
};

export default Feed;