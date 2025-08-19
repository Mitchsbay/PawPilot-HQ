import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { supabase, Pet, uploadFile } from '../lib/supabase';
import { 
  Play, Pause, Heart, MessageCircle, Share, Plus, 
  Upload, X, Check, Volume2, VolumeX, MoreHorizontal,
  Camera, Edit, Trash2, Flag, User, ChevronUp, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/UI/ConfirmDialog';

interface Reel {
  id: string;
  author_id: string;
  video_url: string;
  caption?: string;
  thumbnail_url?: string;
  duration?: number;
  visibility: 'public' | 'friends' | 'private';
  likes_count: number;
  comments_count: number;
  views_count: number;
  created_at: string;
  profiles: {
    id: string;
    display_name: string;
    avatar_url?: string;
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

const Reels: React.FC = () => {
  const { profile } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [deletingReel, setDeletingReel] = useState<Reel | null>(null);
  const [reportingReel, setReportingReel] = useState<Reel | null>(null);

  // Video player states
  const [playingVideos, setPlayingVideos] = useState<Set<string>>(new Set());
  const [mutedVideos, setMutedVideos] = useState<Set<string>>(new Set());
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});

  // Create reel form
  const [reelData, setReelData] = useState({
    caption: '',
    visibility: 'public' as 'public' | 'friends' | 'private'
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Comments
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (profile) {
      loadReels();
      loadPets();
    }
  }, [profile]);

  useEffect(() => {
    // Auto-play current reel
    const currentReel = reels[currentReelIndex];
    if (currentReel) {
      const video = videoRefs.current[currentReel.id];
      if (video) {
        video.play().catch(() => {
          // Auto-play failed, user interaction required
        });
        setPlayingVideos(prev => new Set([...prev, currentReel.id]));
      }
    }

    // Pause other videos
    reels.forEach((reel, index) => {
      if (index !== currentReelIndex) {
        const video = videoRefs.current[reel.id];
        if (video) {
          video.pause();
          setPlayingVideos(prev => {
            const newSet = new Set(prev);
            newSet.delete(reel.id);
            return newSet;
          });
        }
      }
    });
  }, [currentReelIndex, reels]);

  const loadReels = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('reels')
        .select(`
          *,
          profiles!reels_author_id_fkey(id, display_name, avatar_url)
        `)
        .eq('visibility', 'public') // For now, only show public reels
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading reels:', error);
        toast.error('Failed to load reels');
      } else {
        // Check which reels the user has liked
        const reelsWithLikes = await Promise.all(
          (data || []).map(async (reel) => {
            const { data: likeData } = await supabase
              .from('post_likes') // Reusing post_likes table for reels
              .select('id')
              .eq('post_id', reel.id)
              .eq('user_id', profile.id)
              .single();

            return {
              ...reel,
              user_liked: !!likeData
            };
          })
        );

        setReels(reelsWithLikes);
      }
    } catch (error) {
      console.error('Error loading reels:', error);
      toast.error('Failed to load reels');
    } finally {
      setLoading(false);
    }
  };

  const loadPets = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('owner_id', profile.id)
        .order('name');

      if (error) {
        console.error('Error loading pets:', error);
      } else {
        setPets(data || []);
      }
    } catch (error) {
      console.error('Error loading pets:', error);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        toast.error('Video must be less than 100MB');
        return;
      }
      
      if (!file.type.startsWith('video/')) {
        toast.error('Please select a video file');
        return;
      }

      setVideoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setVideoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCreateReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !videoFile) return;

    if (!reelData.caption.trim()) {
      toast.error('Caption is required');
      return;
    }

    setSubmitting(true);

    try {
      // Upload video
      const filename = `reel_${Date.now()}.${videoFile.name.split('.').pop()}`;
      const videoUrl = await uploadFile('reelVideos', filename, videoFile);
      
      if (!videoUrl) {
        toast.error('Failed to upload video');
        setSubmitting(false);
        return;
      }

      // Create thumbnail from video (simplified - in production would use video processing)
      const thumbnailUrl = videoUrl; // Using video URL as thumbnail for now

      const newReel = {
        author_id: profile.id,
        video_url: videoUrl,
        caption: reelData.caption.trim(),
        thumbnail_url: thumbnailUrl,
        duration: null, // Would be calculated from video metadata
        visibility: reelData.visibility,
        likes_count: 0,
        comments_count: 0,
        views_count: 0
      };

      const { error } = await supabase
        .from('reels')
        .insert(newReel);

      if (error) {
        toast.error('Failed to create reel');
        console.error('Error creating reel:', error);
      } else {
        toast.success('Reel created successfully!');
        setShowCreateModal(false);
        resetCreateForm();
        loadReels();
      }
    } catch (error) {
      console.error('Error creating reel:', error);
      toast.error('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setReelData({
      caption: '',
      visibility: 'public'
    });
    setVideoFile(null);
    setVideoPreview('');
  };

  const handleLike = async (reel: Reel) => {
    if (!profile) return;

    try {
      if (reel.user_liked) {
        // Unlike
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', reel.id)
          .eq('user_id', profile.id);

        if (!error) {
          setReels(prev => prev.map(r => 
            r.id === reel.id 
              ? { ...r, user_liked: false, likes_count: r.likes_count - 1 }
              : r
          ));

          await supabase
            .from('reels')
            .update({ likes_count: reel.likes_count - 1 })
            .eq('id', reel.id);
        }
      } else {
        // Like
        const { error } = await supabase
          .from('post_likes')
          .insert({
            post_id: reel.id,
            user_id: profile.id
          });

        if (!error) {
          setReels(prev => prev.map(r => 
            r.id === reel.id 
              ? { ...r, user_liked: true, likes_count: r.likes_count + 1 }
              : r
          ));

          await supabase
            .from('reels')
            .update({ likes_count: reel.likes_count + 1 })
            .eq('id', reel.id);
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  const togglePlayPause = (reelId: string) => {
    const video = videoRefs.current[reelId];
    if (video) {
      if (playingVideos.has(reelId)) {
        video.pause();
        setPlayingVideos(prev => {
          const newSet = new Set(prev);
          newSet.delete(reelId);
          return newSet;
        });
      } else {
        video.play();
        setPlayingVideos(prev => new Set([...prev, reelId]));
      }
    }
  };

  const toggleMute = (reelId: string) => {
    const video = videoRefs.current[reelId];
    if (video) {
      video.muted = !video.muted;
      if (video.muted) {
        setMutedVideos(prev => new Set([...prev, reelId]));
      } else {
        setMutedVideos(prev => {
          const newSet = new Set(prev);
          newSet.delete(reelId);
          return newSet;
        });
      }
    }
  };

  const navigateReel = (direction: 'up' | 'down') => {
    if (direction === 'up' && currentReelIndex > 0) {
      setCurrentReelIndex(prev => prev - 1);
    } else if (direction === 'down' && currentReelIndex < reels.length - 1) {
      setCurrentReelIndex(prev => prev + 1);
    }
  };

  const handleShare = async (reel: Reel) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${reel.profiles.display_name}'s reel`,
          text: reel.caption,
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }

      // Update share count (views_count used as share count for now)
      await supabase
        .from('reels')
        .update({ views_count: reel.views_count + 1 })
        .eq('id', reel.id);

      setReels(prev => prev.map(r => 
        r.id === reel.id 
          ? { ...r, views_count: r.views_count + 1 }
          : r
      ));
    } catch (error) {
      console.error('Error sharing reel:', error);
    }
  };

  const handleDeleteReel = async () => {
    if (!deletingReel) return;

    try {
      const { error } = await supabase
        .from('reels')
        .delete()
        .eq('id', deletingReel.id);

      if (error) {
        toast.error('Failed to delete reel');
        console.error('Error deleting reel:', error);
      } else {
        toast.success('Reel deleted successfully');
        loadReels();
      }
    } catch (error) {
      console.error('Error deleting reel:', error);
      toast.error('Failed to delete reel');
    } finally {
      setDeletingReel(null);
    }
  };

  const loadComments = async (reelId: string) => {
    try {
      const { data, error } = await supabase
        .from('post_comments') // Reusing post_comments table for reels
        .select(`
          *,
          profiles!post_comments_author_id_fkey(display_name, avatar_url)
        `)
        .eq('post_id', reelId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading comments:', error);
      } else {
        setReels(prev => prev.map(reel => 
          reel.id === reelId 
            ? { ...reel, comments: data || [] }
            : reel
        ));
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleComment = async (reelId: string) => {
    if (!profile || !commentText.trim()) return;

    setSubmittingComment(true);

    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: reelId,
          author_id: profile.id,
          content: commentText.trim()
        });

      if (error) {
        toast.error('Failed to add comment');
        console.error('Error adding comment:', error);
      } else {
        setCommentText('');
        loadComments(reelId);
        
        // Update comments count
        const reel = reels.find(r => r.id === reelId);
        if (reel) {
          await supabase
            .from('reels')
            .update({ comments_count: reel.comments_count + 1 })
            .eq('id', reelId);
          
          setReels(prev => prev.map(r => 
            r.id === reelId 
              ? { ...r, comments_count: r.comments_count + 1 }
              : r
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
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black relative overflow-hidden">
      {/* Create Reel Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed top-4 right-4 z-20 bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 transition-colors shadow-lg"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Navigation Arrows */}
      {reels.length > 1 && (
        <>
          <button
            onClick={() => navigateReel('up')}
            disabled={currentReelIndex === 0}
            className="fixed right-4 top-1/2 transform -translate-y-16 z-20 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronUp className="h-6 w-6" />
          </button>
          <button
            onClick={() => navigateReel('down')}
            disabled={currentReelIndex === reels.length - 1}
            className="fixed right-4 top-1/2 transform translate-y-8 z-20 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronDown className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Reels Container */}
      {reels.length > 0 ? (
        <div className="h-full">
          {reels.map((reel, index) => (
            <div
              key={reel.id}
              className={`absolute inset-0 transition-transform duration-300 ${
                index === currentReelIndex ? 'translate-y-0' : 
                index < currentReelIndex ? '-translate-y-full' : 'translate-y-full'
              }`}
            >
              {/* Video */}
              <div className="relative h-full flex items-center justify-center">
                <video
                  ref={(el) => {
                    if (el) videoRefs.current[reel.id] = el;
                  }}
                  src={reel.video_url}
                  className="h-full w-auto max-w-full object-contain"
                  loop
                  muted={mutedVideos.has(reel.id)}
                  playsInline
                  onClick={() => togglePlayPause(reel.id)}
                />

                {/* Play/Pause Overlay */}
                {!playingVideos.has(reel.id) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={() => togglePlayPause(reel.id)}
                      className="bg-black/50 text-white p-4 rounded-full"
                    >
                      <Play className="h-8 w-8" />
                    </button>
                  </div>
                )}

                {/* User Info */}
                <div className="absolute bottom-20 left-4 text-white">
                  <div className="flex items-center space-x-3 mb-3">
                    {reel.profiles.avatar_url ? (
                      <img
                        src={reel.profiles.avatar_url}
                        alt={reel.profiles.display_name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-white"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center border-2 border-white">
                        <User className="h-5 w-5 text-white" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold">{reel.profiles.display_name}</h3>
                      <p className="text-sm text-gray-300">{formatTimeAgo(reel.created_at)}</p>
                    </div>
                  </div>
                  
                  {reel.caption && (
                    <p className="text-sm max-w-xs">{reel.caption}</p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="absolute bottom-20 right-4 flex flex-col space-y-4">
                  {/* Like */}
                  <div className="text-center">
                    <button
                      onClick={() => handleLike(reel)}
                      className={`p-3 rounded-full transition-colors ${
                        reel.user_liked 
                          ? 'bg-red-600 text-white' 
                          : 'bg-black/50 text-white hover:bg-black/70'
                      }`}
                    >
                      <Heart className={`h-6 w-6 ${reel.user_liked ? 'fill-current' : ''}`} />
                    </button>
                    <p className="text-white text-xs mt-1">{reel.likes_count}</p>
                  </div>

                  {/* Comment */}
                  <div className="text-center">
                    <button
                      onClick={() => {
                        if (showComments === reel.id) {
                          setShowComments(null);
                        } else {
                          setShowComments(reel.id);
                          if (!reel.comments) {
                            loadComments(reel.id);
                          }
                        }
                      }}
                      className="p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                    >
                      <MessageCircle className="h-6 w-6" />
                    </button>
                    <p className="text-white text-xs mt-1">{reel.comments_count}</p>
                  </div>

                  {/* Share */}
                  <div className="text-center">
                    <button
                      onClick={() => handleShare(reel)}
                      className="p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                    >
                      <Share className="h-6 w-6" />
                    </button>
                    <p className="text-white text-xs mt-1">{reel.views_count}</p>
                  </div>

                  {/* Mute/Unmute */}
                  <button
                    onClick={() => toggleMute(reel.id)}
                    className="p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                  >
                    {mutedVideos.has(reel.id) ? (
                      <VolumeX className="h-6 w-6" />
                    ) : (
                      <Volume2 className="h-6 w-6" />
                    )}
                  </button>

                  {/* More Options */}
                  {reel.author_id === profile?.id && (
                    <button
                      onClick={() => setDeletingReel(reel)}
                      className="p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                    >
                      <Trash2 className="h-6 w-6" />
                    </button>
                  )}
                </div>

                {/* Comments Sidebar */}
                <AnimatePresence>
                  {showComments === reel.id && (
                    <motion.div
                      initial={{ x: '100%' }}
                      animate={{ x: 0 }}
                      exit={{ x: '100%' }}
                      className="absolute right-0 top-0 bottom-0 w-80 bg-black/90 text-white p-4 overflow-y-auto"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Comments</h3>
                        <button
                          onClick={() => setShowComments(null)}
                          className="text-gray-400 hover:text-white"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Comments List */}
                      {reel.comments && reel.comments.length > 0 && (
                        <div className="space-y-3 mb-4">
                          {reel.comments.map((comment) => (
                            <div key={comment.id} className="flex space-x-3">
                              {comment.profiles.avatar_url ? (
                                <img
                                  src={comment.profiles.avatar_url}
                                  alt={comment.profiles.display_name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                                  <User className="h-4 w-4" />
                                </div>
                              )}
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">
                                  {comment.profiles.display_name}
                                </h4>
                                <p className="text-sm text-gray-300">{comment.content}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatTimeAgo(comment.created_at)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Comment */}
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Add a comment..."
                          className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleComment(reel.id);
                            }
                          }}
                        />
                        <button
                          onClick={() => handleComment(reel.id)}
                          disabled={!commentText.trim() || submittingComment}
                          className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-full flex items-center justify-center text-white text-center">
          <div>
            <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">No reels yet</h3>
            <p className="text-gray-400 mb-6">
              Be the first to share a pet reel!
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Create Your First Reel</span>
            </button>
          </div>
        </div>
      )}

      {/* Create Reel Modal */}
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
                className="fixed inset-0 bg-black bg-opacity-75"
              />

              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Create Reel</h2>
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
                <form onSubmit={handleCreateReel} className="p-6 space-y-4">
                  {/* Video Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Video *
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      {videoPreview ? (
                        <div className="space-y-4">
                          <video
                            src={videoPreview}
                            className="w-full h-32 object-cover rounded-lg"
                            controls
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setVideoFile(null);
                              setVideoPreview('');
                            }}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove video
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <label className="cursor-pointer">
                            <span className="text-blue-600 hover:text-blue-700 font-medium">
                              Choose video
                            </span>
                            <span className="text-gray-600"> or drag and drop</span>
                            <input
                              type="file"
                              accept="video/*"
                              onChange={handleVideoUpload}
                              className="hidden"
                            />
                          </label>
                          <p className="text-xs text-gray-500 mt-1">MP4, MOV up to 100MB</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Caption */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Caption *
                    </label>
                    <textarea
                      required
                      value={reelData.caption}
                      onChange={(e) => setReelData(prev => ({ ...prev, caption: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="What's happening in your reel?"
                    />
                  </div>

                  {/* Visibility */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Visibility
                    </label>
                    <select
                      value={reelData.visibility}
                      onChange={(e) => setReelData(prev => ({ ...prev, visibility: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="public">🌍 Public - Anyone can see</option>
                      <option value="friends">👥 Friends - Only friends can see</option>
                      <option value="private">🔒 Private - Only you can see</option>
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        resetCreateForm();
                      }}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !videoFile}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Create Reel</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Reel Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingReel}
        onClose={() => setDeletingReel(null)}
        onConfirm={handleDeleteReel}
        title="Delete Reel"
        message="Are you sure you want to delete this reel? This action cannot be undone."
        confirmText="Delete Reel"
        type="danger"
      />
    </div>
  );
};

export default Reels;