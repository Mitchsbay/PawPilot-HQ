import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, X, Check, Save } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase, Pet } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface PostSchedulerProps {
  isOpen: boolean;
  onClose: () => void;
  pets: Pet[];
  onScheduled: () => void;
}

const PostScheduler: React.FC<PostSchedulerProps> = ({
  isOpen,
  onClose,
  pets,
  onScheduled
}) => {
  const { profile } = useAuth();
  const [postData, setPostData] = useState({
    content: '',
    visibility: 'public' as 'public' | 'friends' | 'private',
    pet_id: '',
    scheduled_for: '',
    is_draft: false
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!postData.content.trim()) {
      toast.error('Post content is required');
      return;
    }

    if (!postData.is_draft && !postData.scheduled_for) {
      toast.error('Please select a schedule time or save as draft');
      return;
    }

    if (postData.scheduled_for && new Date(postData.scheduled_for) <= new Date()) {
      toast.error('Scheduled time must be in the future');
      return;
    }

    setSubmitting(true);

    try {
      const scheduledPost = {
        author_id: profile.id,
        content: postData.content.trim(),
        visibility: postData.visibility,
        pet_id: postData.pet_id || null,
        scheduled_for: postData.is_draft ? null : postData.scheduled_for,
        is_draft: postData.is_draft,
        status: postData.is_draft ? 'draft' : 'scheduled'
      };

      const { error } = await supabase
        .from('scheduled_posts')
        .insert(scheduledPost);

      if (error) {
        toast.error(postData.is_draft ? 'Failed to save draft' : 'Failed to schedule post');
        console.error('Error scheduling post:', error);
      } else {
        toast.success(postData.is_draft ? 'Draft saved!' : 'Post scheduled successfully!');
        onScheduled();
        onClose();
        resetForm();
      }
    } catch (error) {
      console.error('Error scheduling post:', error);
      toast.error('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setPostData({
      content: '',
      visibility: 'public',
      pet_id: '',
      scheduled_for: '',
      is_draft: false
    });
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5); // Minimum 5 minutes from now
    return now.toISOString().slice(0, 16);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-full p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Schedule Post</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Post Content *
                </label>
                <textarea
                  value={postData.content}
                  onChange={(e) => setPostData(prev => ({ ...prev, content: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What would you like to share?"
                />
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Visibility
                </label>
                <select
                  value={postData.visibility}
                  onChange={(e) => setPostData(prev => ({ ...prev, visibility: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="public">🌍 Public - Anyone can see</option>
                  <option value="friends">👥 Friends - Only friends can see</option>
                  <option value="private">🔒 Private - Only you can see</option>
                </select>
              </div>

              {/* Pet Tag */}
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

              {/* Schedule Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Publishing Options
                </label>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="publishOption"
                      checked={!postData.is_draft}
                      onChange={() => setPostData(prev => ({ ...prev, is_draft: false }))}
                      className="mr-3 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900">Schedule for later</span>
                      <p className="text-sm text-gray-600">Choose when to publish this post</p>
                    </div>
                  </label>

                  {!postData.is_draft && (
                    <div className="ml-6">
                      <input
                        type="datetime-local"
                        value={postData.scheduled_for}
                        onChange={(e) => setPostData(prev => ({ ...prev, scheduled_for: e.target.value }))}
                        min={getMinDateTime()}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="publishOption"
                      checked={postData.is_draft}
                      onChange={() => setPostData(prev => ({ ...prev, is_draft: true }))}
                      className="mr-3 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900">Save as draft</span>
                      <p className="text-sm text-gray-600">Save to drafts for later editing</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>{postData.is_draft ? 'Saving...' : 'Scheduling...'}</span>
                    </>
                  ) : (
                    <>
                      {postData.is_draft ? <Save className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
                      <span>{postData.is_draft ? 'Save Draft' : 'Schedule Post'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default PostScheduler;