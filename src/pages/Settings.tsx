import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase, uploadFile } from '../lib/supabase';
import {
  User, Lock, Bell, Eye, Shield, Trash2, Upload,
  Check, X, Camera, Mail, Phone, Globe, Users,
  UserX, MessageCircle, Heart, Calendar, MapPin, Bookmark,
  AlertTriangle, Save, BarChart, Edit, Crown
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/UI/ConfirmDialog';
import BlockedUsers from '../components/Privacy/BlockedUsers';
import SavedPosts from '../components/Feed/SavedPosts';
import DraftPosts from '../components/Feed/DraftPosts';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useEmailNotifications } from '../hooks/useEmailNotifications';
import UserAnalytics from '../components/Analytics/UserAnalytics';
import AdvancedPrivacyControls from '../components/Privacy/AdvancedPrivacyControls';

import Billing from '../features/payments/Billing';

const Settings: React.FC = () => {
  const { profile, updateProfile, signOut } = useAuth();
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, loading: pushLoading, subscribeToPush, unsubscribeFromPush } = usePushNotifications();
  const { preferences: emailPreferences, loading: emailLoading, updateEmailPreferences, sendTestEmail } = useEmailNotifications();

  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Profile settings
  const [profileData, setProfileData] = useState({
    display_name: '',
    bio: '',
    phone_number: ''
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  // Privacy settings
  const [privacyData, setPrivacyData] = useState({
    profile_visibility: 'public' as 'public' | 'friends' | 'private',
    default_post_visibility: 'public' as 'public' | 'friends' | 'private',
    allow_messages_from: 'public' as 'public' | 'friends' | 'private',
    allow_tagging: true,
    allow_mentions: true,
    show_online_status: true
  });

  // Notification settings
  const [notificationData, setNotificationData] = useState({
    notify_likes: true,
    notify_comments: true,
    notify_messages: true,
    notify_follows: true,
    notify_events: true,
    notify_lost_found: true,
    lost_found_contact_email: true,
    lost_found_contact_phone: false
  });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'privacy', label: 'Basic Privacy', icon: Lock },
    { id: 'advanced-privacy', label: 'Advanced Privacy', icon: Shield },
    { id: 'blocked', label: 'Blocked Users', icon: UserX },
    { id: 'saved', label: 'Saved Posts', icon: Bookmark },
    { id: 'drafts', label: 'Drafts & Scheduled', icon: Edit },
    { id: 'analytics', label: 'Analytics', icon: BarChart },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'billing', label: 'Billing', icon: Crown },
    { id: 'account', label: 'Account', icon: Shield }
  ];

  useEffect(() => {
    if (profile) {
      setProfileData({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        phone_number: profile.phone_number || ''
      });
      setAvatarPreview(profile.avatar_url || '');

      setPrivacyData({
        profile_visibility: profile.profile_visibility || 'public',
        default_post_visibility: profile.default_post_visibility || 'public',
        allow_messages_from: profile.allow_messages_from || 'public',
        allow_tagging: profile.allow_tagging ?? true,
        allow_mentions: profile.allow_mentions ?? true,
        show_online_status: profile.show_online_status ?? true
      });

      setNotificationData({
        notify_likes: profile.notify_likes ?? true,
        notify_comments: profile.notify_comments ?? true,
        notify_messages: profile.notify_messages ?? true,
        notify_follows: profile.notify_follows ?? true,
        notify_events: profile.notify_events ?? true,
        notify_lost_found: profile.notify_lost_found ?? true,
        lost_found_contact_email: profile.lost_found_contact_email ?? true,
        lost_found_contact_phone: profile.lost_found_contact_phone ?? false
      });
    }
  }, [profile]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Avatar must be less than 5MB');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSave = async () => {
    if (!profile) return;

    if (!profileData.display_name.trim()) {
      toast.error('Display name is required');
      return;
    }

    setLoading(true);

    try {
      let avatarUrl: string | null = profile.avatar_url || null;

      // Upload new avatar if provided
      if (avatarFile) {
        const filename = `avatar_${Date.now()}.${avatarFile.name.split('.').pop()}`;
        const uploadedUrl = await uploadFile('avatars', filename, avatarFile);

        if (!uploadedUrl) {
          toast.error('Failed to upload avatar');
          setLoading(false);
          return;
        }
        avatarUrl = uploadedUrl;
      }

      const updates = {
        display_name: profileData.display_name.trim(),
        bio: profileData.bio.trim() || null,
        phone_number: profileData.phone_number.trim() || null,
        avatar_url: avatarUrl
      };

      const { error } = await updateProfile(updates);

      if (error) {
        toast.error('Failed to update profile');
        console.error('Error updating profile:', error);
      } else {
        toast.success('Profile updated successfully!');
        setAvatarFile(null);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handlePrivacySave = async () => {
    if (!profile) return;

    setLoading(true);

    try {
      const { error } = await updateProfile(privacyData);

      if (error) {
        toast.error('Failed to update privacy settings');
        console.error('Error updating privacy settings:', error);
      } else {
        toast.success('Privacy settings updated successfully!');
      }
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationSave = async () => {
    if (!profile) return;

    setLoading(true);

    try {
      const { error } = await updateProfile(notificationData);

      if (error) {
        toast.error('Failed to update notification settings');
        console.error('Error updating notification settings:', error);
      } else {
        toast.success('Notification settings updated successfully!');
      }
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!profile) return;

    try {
      // Note: In a real app, you'd want to handle this server-side
      const { error } = await supabase.auth.admin.deleteUser(profile.id);

      if (error) {
        toast.error('Failed to delete account');
        console.error('Error deleting account:', error);
      } else {
        toast.success('Account deleted successfully');
        await signOut();
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    }
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>

        {/* Avatar Upload */}
        <div className="flex items-center space-x-6 mb-6">
          <div className="relative">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover border-4 border-gray-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-full border-4 border-dashed border-gray-300 flex items-center justify-center">
                <Camera className="h-8 w-8 text-gray-400" />
              </div>
            )}
            <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
              <Upload className="h-3 w-3" />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </label>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Profile Photo</h4>
            <p className="text-sm text-gray-600">Upload a photo to help others recognize you</p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name *
            </label>
            <input
              type="text"
              value={profileData.display_name}
              onChange={(e) => setProfileData(prev => ({ ...prev, display_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your display name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={profile?.email || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={profileData.phone_number}
              onChange={(e) => setProfileData(prev => ({ ...prev, phone_number: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your phone number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </label>
            <textarea
              value={profileData.bio}
              onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tell others about yourself and your pets..."
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={handleProfileSave}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderPrivacyTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Privacy Settings</h3>

        <div className="space-y-6">
          {/* Profile Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Profile Visibility
            </label>
            <select
              value={privacyData.profile_visibility}
              onChange={(e) => setPrivacyData(prev => ({ ...prev, profile_visibility: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="public">Public - Anyone can see your profile</option>
              <option value="friends">Friends - Only friends can see your profile</option>
              <option value="private">Private - Only you can see your profile</option>
            </select>
          </div>

          {/* Default Post Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Post Visibility
            </label>
            <select
              value={privacyData.default_post_visibility}
              onChange={(e) => setPrivacyData(prev => ({ ...prev, default_post_visibility: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="public">Public - Anyone can see your posts</option>
              <option value="friends">Friends - Only friends can see your posts</option>
              <option value="private">Private - Only you can see your posts</option>
            </select>
          </div>

          {/* Message Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Who can message you
            </label>
            <select
              value={privacyData.allow_messages_from}
              onChange={(e) => setPrivacyData(prev => ({ ...prev, allow_messages_from: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="public">Anyone</option>
              <option value="friends">Friends only</option>
              <option value="private">No one</option>
            </select>
          </div>

          {/* Toggle Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Allow tagging in posts</h4>
                <p className="text-sm text-gray-600">Let others tag you in their posts</p>
              </div>
              <button
                onClick={() => setPrivacyData(prev => ({ ...prev, allow_tagging: !prev.allow_tagging }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  privacyData.allow_tagging ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    privacyData.allow_tagging ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Allow mentions</h4>
                <p className="text-sm text-gray-600">Let others mention you in comments</p>
              </div>
              <button
                onClick={() => setPrivacyData(prev => ({ ...prev, allow_mentions: !prev.allow_mentions }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  privacyData.allow_mentions ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    privacyData.allow_mentions ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Show online status</h4>
                <p className="text-sm text-gray-600">Let others see when you're online</p>
              </div>
              <button
                onClick={() => setPrivacyData(prev => ({ ...prev, show_online_status: !prev.show_online_status }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  privacyData.show_online_status ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    privacyData.show_online_status ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={handlePrivacySave}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>

        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-4">Social Notifications</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Heart className="h-5 w-5 text-red-500" />
                  <div>
                    <h5 className="font-medium text-gray-900">Likes</h5>
                    <p className="text-sm text-gray-600">When someone likes your posts</p>
                  </div>
                </div>
                <button
                  onClick={() => setNotificationData(prev => ({ ...prev, notify_likes: !prev.notify_likes }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notificationData.notify_likes ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notificationData.notify_likes ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <MessageCircle className="h-5 w-5 text-blue-500" />
                  <div>
                    <h5 className="font-medium text-gray-900">Comments</h5>
                    <p className="text-sm text-gray-600">When someone comments on your posts</p>
                  </div>
                </div>
                <button
                  onClick={() => setNotificationData(prev => ({ ...prev, notify_comments: !prev.notify_comments }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notificationData.notify_comments ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notificationData.notify_comments ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-green-500" />
                  <div>
                    <h5 className="font-medium text-gray-900">Follows</h5>
                    <p className="text-sm text-gray-600">When someone follows you</p>
                  </div>
                </div>
                <button
                  onClick={() => setNotificationData(prev => ({ ...prev, notify_follows: !prev.notify_follows }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notificationData.notify_follows ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notificationData.notify_follows ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-purple-500" />
                  <div>
                    <h5 className="font-medium text-gray-900">Messages</h5>
                    <p className="text-sm text-gray-600">When you receive new messages</p>
                  </div>
                </div>
                <button
                  onClick={() => setNotificationData(prev => ({ ...prev, notify_messages: !prev.notify_messages }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notificationData.notify_messages ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notificationData.notify_messages ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-4">Community Notifications</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-orange-500" />
                  <div>
                    <h5 className="font-medium text-gray-900">Events</h5>
                    <p className="text-sm text-gray-600">Event invitations and updates</p>
                  </div>
                </div>
                <button
                  onClick={() => setNotificationData(prev => ({ ...prev, notify_events: !prev.notify_events }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notificationData.notify_events ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notificationData.notify_events ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-red-500" />
                  <div>
                    <h5 className="font-medium text-gray-900">Lost & Found</h5>
                    <p className="text-sm text-gray-600">Lost pet alerts in your area</p>
                  </div>
                </div>
                <button
                  onClick={() => setNotificationData(prev => ({ ...prev, notify_lost_found: !prev.notify_lost_found }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notificationData.notify_lost_found ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notificationData.notify_lost_found ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-4">Lost & Found Contact Preferences</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-blue-500" />
                  <div>
                    <h5 className="font-medium text-gray-900">Email Contact</h5>
                    <p className="text-sm text-gray-600">Allow contact via email for lost pets</p>
                  </div>
                </div>
                <button
                  onClick={() => setNotificationData(prev => ({ ...prev, lost_found_contact_email: !prev.lost_found_contact_email }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notificationData.lost_found_contact_email ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notificationData.lost_found_contact_email ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-green-500" />
                  <div>
                    <h5 className="font-medium text-gray-900">Phone Contact</h5>
                    <p className="text-sm text-gray-600">Allow contact via phone for lost pets</p>
                  </div>
                </div>
                <button
                  onClick={() => setNotificationData(prev => ({ ...prev, lost_found_contact_phone: !prev.lost_found_contact_phone }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notificationData.lost_found_contact_phone ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notificationData.lost_found_contact_phone ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-4">Email Notifications</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-medium text-gray-900">Daily Digest</h5>
                  <p className="text-sm text-gray-600">Daily summary of activity and updates</p>
                </div>
                <button
                  onClick={() => updateEmailPreferences({ daily_digest: !emailPreferences.daily_digest })}
                  disabled={emailLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                    emailPreferences.daily_digest ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      emailPreferences.daily_digest ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-medium text-gray-900">Weekly Summary</h5>
                  <p className="text-sm text-gray-600">Weekly recap of your pet community activity</p>
                </div>
                <button
                  onClick={() => updateEmailPreferences({ weekly_summary: !emailPreferences.weekly_summary })}
                  disabled={emailLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                    emailPreferences.weekly_summary ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      emailPreferences.weekly_summary ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-medium text-gray-900">Important Alerts</h5>
                  <p className="text-sm text-gray-600">Critical notifications and security alerts</p>
                </div>
                <button
                  onClick={() => updateEmailPreferences({ lost_found_alerts: !emailPreferences.lost_found_alerts })}
                  disabled={emailLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                    emailPreferences.lost_found_alerts ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      emailPreferences.lost_found_alerts ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={sendTestEmail}
                disabled={emailLoading}
                className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {emailLoading ? 'Sending...' : 'Send Test Email'}
              </button>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-4">Push Notifications</h4>
            <div className="space-y-4">
              {pushSupported ? (
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-gray-900">Browser Notifications</h5>
                    <p className="text-sm text-gray-600">Get notified even when the app is closed</p>
                  </div>
                  <button
                    onClick={pushSubscribed ? unsubscribeFromPush : subscribeToPush}
                    disabled={pushLoading}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                      pushSubscribed ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        pushSubscribed ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    Push notifications are not supported in this browser.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={handleNotificationSave}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderAccountTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Account Management</h3>

        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Account Security</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Keep your account secure by using a strong password and enabling two-factor authentication when available.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Trash2 className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-red-800">Delete Account</h4>
                <p className="text-sm text-red-700 mt-1 mb-4">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <button
                  onClick={() => setShowDeleteDialog(true)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account preferences and privacy settings</p>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'profile' && renderProfileTab()}
            {activeTab === 'privacy' && renderPrivacyTab()}
            {activeTab === 'advanced-privacy' && <AdvancedPrivacyControls />}
            {activeTab === 'blocked' && <BlockedUsers />}
            {activeTab === 'saved' && <SavedPosts />}
            {activeTab === 'drafts' && <DraftPosts />}
            {activeTab === 'analytics' && <UserAnalytics />}
            {activeTab === 'notifications' && renderNotificationsTab()}
            {activeTab === 'billing' && <Billing />}
            {activeTab === 'account' && renderAccountTab()}
          </motion.div>
        </div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="Are you sure you want to delete your account? This will permanently delete all your data, including pets, health records, posts, and messages. This action cannot be undone."
        confirmText="Delete Account"
        type="danger"
      />
    </div>
  );
};

export default Settings;
