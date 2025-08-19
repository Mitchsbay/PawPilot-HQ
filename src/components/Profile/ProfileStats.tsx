import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { Heart, Camera, Users, Calendar, TrendingUp, Award } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProfileStatsProps {
  userId: string;
  isOwnProfile: boolean;
}

interface UserStats {
  posts_count: number;
  pets_count: number;
  followers_count: number;
  following_count: number;
  likes_received: number;
  comments_received: number;
  join_date: string;
  most_liked_post?: {
    id: string;
    content: string;
    likes_count: number;
  };
}

const ProfileStats: React.FC<ProfileStatsProps> = ({ userId, isOwnProfile }) => {
  const [stats, setStats] = useState<UserStats>({
    posts_count: 0,
    pets_count: 0,
    followers_count: 0,
    following_count: 0,
    likes_received: 0,
    comments_received: 0,
    join_date: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [userId]);

  const loadStats = async () => {
    try {
      // Get basic counts
      const [
        { count: postsCount },
        { count: petsCount },
        { count: followersCount },
        { count: followingCount }
      ] = await Promise.all([
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', userId),
        supabase.from('pets').select('*', { count: 'exact', head: true }).eq('owner_id', userId),
        supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId)
      ]);

      // Get engagement stats
      const { data: postsData } = await supabase
        .from('posts')
        .select('id, content, likes_count, comments_count, created_at')
        .eq('author_id', userId);

      const totalLikes = postsData?.reduce((sum, post) => sum + post.likes_count, 0) || 0;
      const totalComments = postsData?.reduce((sum, post) => sum + post.comments_count, 0) || 0;
      
      const mostLikedPost = postsData?.reduce((max, post) => 
        post.likes_count > (max?.likes_count || 0) ? post : max
      , null as any) || null;

      // Get join date
      const { data: profileData } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('id', userId)
        .single();

      setStats({
        posts_count: postsCount || 0,
        pets_count: petsCount || 0,
        followers_count: followersCount || 0,
        following_count: followingCount || 0,
        likes_received: totalLikes,
        comments_received: totalComments,
        join_date: profileData?.created_at || '',
        most_liked_post: mostLikedPost
      });
    } catch (error) {
      console.error('Error loading profile stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-lg shadow-md animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  const statItems = [
    { label: 'Posts', value: stats.posts_count, icon: Camera, color: 'text-blue-600' },
    { label: 'Pets', value: stats.pets_count, icon: Heart, color: 'text-pink-600' },
    { label: 'Followers', value: stats.followers_count, icon: Users, color: 'text-green-600' },
    { label: 'Following', value: stats.following_count, icon: Users, color: 'text-purple-600' },
    { label: 'Likes Received', value: stats.likes_received, icon: Heart, color: 'text-red-600' },
    { label: 'Comments Received', value: stats.comments_received, icon: Camera, color: 'text-orange-600' },
    { label: 'Member Since', value: new Date(stats.join_date).getFullYear(), icon: Calendar, color: 'text-gray-600' },
    { label: 'Engagement Rate', value: stats.posts_count > 0 ? Math.round((stats.likes_received + stats.comments_received) / stats.posts_count * 10) / 10 : 0, icon: TrendingUp, color: 'text-indigo-600' }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statItems.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white p-4 rounded-lg shadow-md text-center"
          >
            <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 mb-2`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Most Liked Post */}
      {stats.most_liked_post && isOwnProfile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow-md p-6"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-yellow-100 rounded-full">
              <Award className="h-5 w-5 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Your Most Popular Post</h3>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-900 mb-3">{stats.most_liked_post.content}</p>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Heart className="h-4 w-4" />
                <span>{stats.most_liked_post.likes_count} likes</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ProfileStats;