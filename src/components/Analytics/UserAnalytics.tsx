import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { 
  BarChart, TrendingUp, Eye, Heart, MessageCircle, 
  Users, Calendar, Camera, Activity, Award
} from 'lucide-react';
import { motion } from 'framer-motion';

interface AnalyticsData {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalFollowers: number;
  totalFollowing: number;
  postsThisWeek: number;
  likesThisWeek: number;
  profileViews: number;
  engagementRate: number;
  topPost: {
    id: string;
    content: string;
    likes_count: number;
    comments_count: number;
  } | null;
  recentActivity: Array<{
    type: string;
    count: number;
    date: string;
  }>;
}

const UserAnalytics: React.FC = () => {
  const { profile } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalPosts: 0,
    totalLikes: 0,
    totalComments: 0,
    totalFollowers: 0,
    totalFollowing: 0,
    postsThisWeek: 0,
    likesThisWeek: 0,
    profileViews: 0,
    engagementRate: 0,
    topPost: null,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');

  useEffect(() => {
    if (profile) {
      loadAnalytics();
    }
  }, [profile, timeRange]);

  const loadAnalytics = async () => {
    if (!profile) return;

    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

      const timeRangeDate = timeRange === 'week' ? weekAgo : timeRange === 'month' ? monthAgo : yearAgo;

      // Get total counts
      const [
        { count: totalPosts },
        { count: totalFollowers },
        { count: totalFollowing },
        { count: postsInRange }
      ] = await Promise.all([
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', profile.id),
        supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id),
        supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id),
        supabase.from('posts').select('*', { count: 'exact', head: true })
          .eq('author_id', profile.id)
          .gte('created_at', timeRangeDate.toISOString())
      ]);

      // Get engagement data
      const { data: postsWithEngagement } = await supabase
        .from('posts')
        .select('id, content, likes_count, comments_count, created_at')
        .eq('author_id', profile.id)
        .order('created_at', { ascending: false });

      const totalLikes = postsWithEngagement?.reduce((sum, post) => sum + post.likes_count, 0) || 0;
      const totalComments = postsWithEngagement?.reduce((sum, post) => sum + post.comments_count, 0) || 0;
      
      const postsInRangeData = postsWithEngagement?.filter(post => 
        new Date(post.created_at) >= timeRangeDate
      ) || [];
      
      const likesInRange = postsInRangeData.reduce((sum, post) => sum + post.likes_count, 0);
      const engagementRate = totalPosts > 0 ? ((totalLikes + totalComments) / totalPosts) : 0;

      // Find top post
      const topPost = postsWithEngagement?.reduce((top, post) => {
        const engagement = post.likes_count + post.comments_count;
        const topEngagement = (top?.likes_count || 0) + (top?.comments_count || 0);
        return engagement > topEngagement ? post : top;
      }, null as any) || null;

      // Generate recent activity data
      const recentActivity = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));

        const dayPosts = postsWithEngagement?.filter(post => {
          const postDate = new Date(post.created_at);
          return postDate >= dayStart && postDate <= dayEnd;
        }).length || 0;

        recentActivity.push({
          type: 'posts',
          count: dayPosts,
          date: dayStart.toISOString().split('T')[0]
        });
      }

      setAnalytics({
        totalPosts: totalPosts || 0,
        totalLikes,
        totalComments,
        totalFollowers: totalFollowers || 0,
        totalFollowing: totalFollowing || 0,
        postsThisWeek: postsInRange || 0,
        likesThisWeek: likesInRange,
        profileViews: Math.floor(Math.random() * 100) + 50, // Simulated for demo
        engagementRate: Math.round(engagementRate * 100) / 100,
        topPost,
        recentActivity
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-md animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Your Analytics</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="week">Last 7 days</option>
          <option value="month">Last 30 days</option>
          <option value="year">Last year</option>
        </select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-lg shadow-md"
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <Camera className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">{analytics.totalPosts}</h3>
              <p className="text-gray-600">Total Posts</p>
              <p className="text-sm text-green-600">+{analytics.postsThisWeek} this {timeRange}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-lg shadow-md"
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100">
              <Heart className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">{analytics.totalLikes}</h3>
              <p className="text-gray-600">Total Likes</p>
              <p className="text-sm text-green-600">+{analytics.likesThisWeek} this {timeRange}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-lg shadow-md"
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">{analytics.totalFollowers}</h3>
              <p className="text-gray-600">Followers</p>
              <p className="text-sm text-blue-600">{analytics.totalFollowing} following</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-lg shadow-md"
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">{analytics.engagementRate}</h3>
              <p className="text-gray-600">Avg. Engagement</p>
              <p className="text-sm text-gray-500">per post</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Top Post */}
      {analytics.topPost && (
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
            <h3 className="text-lg font-semibold text-gray-900">Your Top Post</h3>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-900 mb-3">{analytics.topPost.content}</p>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Heart className="h-4 w-4" />
                <span>{analytics.topPost.likes_count} likes</span>
              </div>
              <div className="flex items-center space-x-1">
                <MessageCircle className="h-4 w-4" />
                <span>{analytics.topPost.comments_count} comments</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Activity Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-lg shadow-md p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="flex items-end space-x-2 h-32">
          {analytics.recentActivity.map((day, index) => {
            const maxCount = Math.max(...analytics.recentActivity.map(d => d.count));
            const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-blue-600 rounded-t transition-all duration-500"
                  style={{ height: `${height}%` }}
                  title={`${day.count} posts on ${new Date(day.date).toLocaleDateString()}`}
                />
                <span className="text-xs text-gray-500 mt-2">
                  {new Date(day.date).toLocaleDateString([], { weekday: 'short' })}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-lg shadow-md p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Insights</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <div>
                <h4 className="font-medium text-gray-900">Engagement Growth</h4>
                <p className="text-sm text-gray-600">Your posts are getting more interaction</p>
              </div>
            </div>
            <span className="text-sm font-medium text-blue-600">+{analytics.likesThisWeek}% this {timeRange}</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-green-600" />
              <div>
                <h4 className="font-medium text-gray-900">Growing Community</h4>
                <p className="text-sm text-gray-600">More people are following your pet journey</p>
              </div>
            </div>
            <span className="text-sm font-medium text-green-600">{analytics.totalFollowers} followers</span>
          </div>

          {analytics.engagementRate > 5 && (
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Award className="h-5 w-5 text-purple-600" />
                <div>
                  <h4 className="font-medium text-gray-900">High Engagement</h4>
                  <p className="text-sm text-gray-600">Your content resonates well with the community</p>
                </div>
              </div>
              <span className="text-sm font-medium text-purple-600">{analytics.engagementRate} avg. engagement</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default UserAnalytics;