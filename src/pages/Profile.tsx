import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase, Profile, Pet, Post } from '../lib/supabase';
import { isFollowing } from '../lib/membership';
import { 
  User, Heart, Camera, MessageCircle, Calendar, MapPin,
  Settings, UserPlus, UserMinus, Mail, Phone, Globe,
  Users, Lock, MoreHorizontal, Flag, UserX, Edit, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import OnlineIndicator from '../components/UI/OnlineIndicator';
import ReportModal from '../components/Moderation/ReportModal';
import BlockUserModal from '../components/Moderation/BlockUserModal';
import ProfileStats from '../components/Profile/ProfileStats';
import FollowButton from '../components/Profile/FollowButton';
import PetCard from '../components/Pets/PetCard';
import PetGallery from '../components/Pets/PetGallery';
import { useBlocking } from '../hooks/useBlocking';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import ActivityFeed from '../components/Profile/ActivityFeed';

interface ProfileWithStats extends Profile {
  followers_count: number;
  following_count: number;
  posts_count: number;
  pets_count: number;
  is_following?: boolean;
  is_followed_by?: boolean;
}

const UserProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { profile: currentUser } = useAuth();
  const { isUserBlocked } = useBlocking();
  const [profileData, setProfileData] = useState<ProfileWithStats | null>(null);
  const { status: userStatus, lastSeen } = useOnlineStatus(userId);
  const [pets, setPets] = useState<Pet[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'pets' | 'activity' | 'about'>('posts');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    if (userId && currentUser) {
      loadProfileData();
      checkIfBlocked();
    }
  }, [userId, currentUser]);

  const checkIfBlocked = async () => {
    if (!userId || !currentUser || isOwnProfile) return;
    
    const blocked = await isUserBlocked(userId);
    setIsBlocked(blocked);
  };

  const loadProfileData = async () => {
    if (!userId) return;

    setError(null);
    try {
      // Load profile with stats
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error loading profile:', profileError);
        setError('Failed to load profile');
        return;
      }

      if (!profileData) {
        setError('Profile not found');
        return;
      }

      // Load stats
      const [
        { count: followersCount },
        { count: followingCount },
        { count: postsCount },
        { count: petsCount }
      ] = await Promise.all([
        supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', userId),
        supabase.from('pets').select('*', { count: 'exact', head: true }).eq('owner_id', userId)
      ]);

      // Check follow relationships
      let isFollowing = false;
      let isFollowedBy = false;

      if (currentUser && !isOwnProfile) {
        const [
          { following: userFollowsProfile, error: followError1 },
          { following: profileFollowsUser, error: followError2 }
        ] = await Promise.all([
          isFollowing(supabase, currentUser.id, userId),
          isFollowing(supabase, userId, currentUser.id)
        ]);
        
        if (followError1) console.error('Error checking follow status:', followError1);
        if (followError2) console.error('Error checking follow back status:', followError2);

        isFollowing = userFollowsProfile;
        isFollowedBy = profileFollowsUser;
      }

      setProfileData({
        ...profileData,
        followers_count: followersCount || 0,
        following_count: followingCount || 0,
        posts_count: postsCount || 0,
        pets_count: petsCount || 0,
        is_following: isFollowing,
        is_followed_by: isFollowedBy
      });

      // Load pets if visible
      if (profileData.profile_visibility === 'public' || isOwnProfile || isFollowing) {
        const { data: petsData } = await supabase
          .from('pets')
          .select('*')
          .eq('owner_id', userId)
          .eq('visibility', 'public')
          .order('created_at', { ascending: false });

        setPets(Array.isArray(petsData) ? petsData : []);
      }

      // Load posts if visible
      if (profileData.profile_visibility === 'public' || isOwnProfile || isFollowing) {
        const { data: postsData } = await supabase
          .from('posts')
          .select('*')
          .eq('author_id', userId)
          .eq('visibility', 'public')
          .order('created_at', { ascending: false })
          .limit(10);

        setPosts(Array.isArray(postsData) ? postsData : []);
      }

    } catch (error) {
      console.error('Error loading profile data:', error);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser || !profileData || isOwnProfile) return;

    try {
      if (profileData.is_following) {
        // Unfollow
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', userId);

        if (!error) {
          setProfileData(prev => prev ? {
            ...prev,
            is_following: false,
            followers_count: prev.followers_count - 1
          } : null);
          toast.success(`Unfollowed ${profileData.display_name}`);
        }
      } else {
        // Follow
        const { error } = await supabase
          .from('user_follows')
          .insert({
            follower_id: currentUser.id,
            following_id: userId!
          });

        if (!error) {
          setProfileData(prev => prev ? {
            ...prev,
            is_following: true,
            followers_count: prev.followers_count + 1
          } : null);
          toast.success(`Now following ${profileData.display_name}`);
        }
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
      toast.error('Failed to update follow status');
    }
  };

  const createConversation = async () => {
    if (!currentUser || !profileData || isOwnProfile) return;

    try {
      // Check if conversation already exists
      const { data: existingThreads } = await supabase
        .from('thread_participants')
        .select('thread_id, threads!inner(is_group)')
        .eq('user_id', currentUser.id)
        .eq('threads.is_group', false);

      if (existingThreads) {
        for (const thread of existingThreads) {
          const { data: otherParticipant } = await supabase
            .from('thread_participants')
            .select('user_id')
            .eq('thread_id', thread.thread_id)
            .eq('user_id', userId)
            .single();

          if (otherParticipant) {
            // Conversation exists, navigate to it
            window.location.href = '/messages';
            return;
          }
        }
      }

      // Create new conversation
      const { data: threadData, error: threadError } = await supabase
        .from('threads')
        .insert({
          is_group: false,
          created_by: currentUser.id
        })
        .select()
        .single();

      if (threadError) {
        toast.error('Failed to create conversation');
        return;
      }

      // Add participants
      const { error: participantsError } = await supabase
        .from('thread_participants')
        .insert([
          { thread_id: threadData.id, user_id: currentUser.id },
          { thread_id: threadData.id, user_id: userId! }
        ]);

      if (participantsError) {
        toast.error('Failed to create conversation');
        return;
      }

      toast.success('Conversation created!');
      window.location.href = '/messages';
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {error || 'Profile not found'}
          </h1>
          <p className="text-gray-600">
            {error ? 'Please try refreshing the page.' : 'This user doesn\'t exist or their profile is private.'}
          </p>
        </div>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <UserX className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">User Blocked</h1>
          <p className="text-gray-600">You have blocked this user.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-md p-6 mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
          {/* Avatar */}
          <div className="relative">
            {profileData.avatar_url ? (
              <img
                src={profileData.avatar_url}
                alt={profileData.display_name}
                className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
              />
            ) : (
              <div className="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center border-4 border-gray-200">
                <User className="h-12 w-12 text-gray-600" />
              </div>
            )}
            {!isOwnProfile && (
              <OnlineIndicator 
                status={userStatus}
                lastSeen={lastSeen || undefined}
                size={16}
                className="absolute bottom-0 right-0"
              />
            )}
          </div>


          {/* Profile Info */}
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{profileData.display_name}</h1>
                {profileData.bio && (
                  <p className="text-gray-600 mt-1">{profileData.bio}</p>
                )}
                {profileData.is_followed_by && !isOwnProfile && (
                  <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    Follows you
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 mt-4 sm:mt-0">
                {isOwnProfile ? (
                  <Link
                    to="/settings"
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit Profile</span>
                  </Link>
                ) : (
                  <>
                    <FollowButton
                      userId={userId!}
                      userName={profileData.display_name}
                      isFollowing={profileData.is_following || false}
                      onFollowChange={(following) => {
                        setProfileData(prev => prev ? {
                          ...prev,
                          is_following: following,
                          followers_count: following 
                            ? prev.followers_count + 1 
                            : prev.followers_count - 1
                        } : null);
                      }}
                    />

                    <button
                      onClick={createConversation}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>Message</span>
                    </button>

                    <div className="relative">
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {/* Dropdown menu would go here */}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{profileData.posts_count}</div>
            <div className="text-sm text-gray-600">Posts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{profileData.pets_count}</div>
            <div className="text-sm text-gray-600">Pets</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{profileData.followers_count}</div>
            <div className="text-sm text-gray-600">Followers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{profileData.following_count}</div>
            <div className="text-sm text-gray-600">Following</div>
          </div>
        </div>
      </motion.div>

      {/* Content Tabs */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('posts')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'posts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Camera className="h-4 w-4 inline mr-2" />
              Posts
            </button>
            <button
              onClick={() => setActiveTab('pets')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'pets'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Heart className="h-4 w-4 inline mr-2" />
              Pets
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'activity'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Activity className="h-4 w-4 inline mr-2" />
              Activity
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'about'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <User className="h-4 w-4 inline mr-2" />
              About
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'posts' && (
            <div>
              {posts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {posts.map((post) => (
                    <div key={post.id} className="border border-gray-200 rounded-lg p-4">
                      <p className="text-gray-900 mb-2">{post.content}</p>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                        <div className="flex space-x-4">
                          <span>{post.likes_count} likes</span>
                          <span>{post.comments_count} comments</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Camera className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
                  <p className="text-gray-600">
                    {isOwnProfile ? 'Share your first post!' : `${profileData.display_name} hasn't posted anything yet.`}
                  </p>
                </div>
              )}
            </div>
          )}
            {activeTab === 'activity' && (
              <ActivityFeed userId={profileData.id} />
            )}

          {activeTab === 'pets' && (
            <div>
              {Array.isArray(pets) && pets.length > 0 ? (
                <div className="space-y-8">
                  {pets.map((pet) => (
                    <div key={pet.id} className="bg-white rounded-lg shadow-md p-6">
                      <div className="flex items-center space-x-4 mb-6">
                        {pet.photo_url ? (
                          <img
                            src={pet.photo_url}
                            alt={pet.name}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                            <Heart className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">{pet.name}</h3>
                          <p className="text-gray-600 capitalize">{pet.species}</p>
                          {pet.breed && <p className="text-sm text-gray-500">{pet.breed}</p>}
                        </div>
                      </div>
                      
                      <PetGallery pet={pet} limit={6} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No pets visible</h3>
                  <p className="text-gray-600">
                    {isOwnProfile ? 'Add your first pet!' : `${profileData.display_name}'s pets are private.`}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'about' && (
            <div>
              <ProfileStats userId={profileData.id} isOwnProfile={isOwnProfile} />
              
              <div className="mt-8 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">About</h3>
                  <p className="text-gray-700">{profileData.bio ?? ''}</p>
                  {!profileData.bio && (
                    <p className="text-gray-500 italic">No bio available</p>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Member Since</h3>
                  <p className="text-gray-700">
                    {new Date(profileData.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                {!isOwnProfile && (
                  <div className="pt-6 border-t border-gray-200">
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setShowReportModal(true)}
                        className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Flag className="h-4 w-4" />
                        <span>Report User</span>
                      </button>
                      <button
                        onClick={() => setShowBlockModal(true)}
                        className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <UserX className="h-4 w-4" />
                        <span>Block User</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report User Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        contentType="user"
        contentId={profileData.id}
        reportedUserId={profileData.id}
        contentTitle={profileData.display_name}
      />

      {/* Block User Modal */}
      <BlockUserModal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        userId={profileData.id}
        userName={profileData.display_name}
        userAvatar={profileData.avatar_url}
      />
    </div>
  );
};

export default UserProfile;
