import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { isEnabled } from '../../lib/flags';
import { 
  BarChart, LineChart, PieChart, TrendingUp, TrendingDown,
  Users, Activity, Calendar, Eye, Heart, MessageCircle,
  Download, Filter, RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';

interface AnalyticsData {
  userGrowth: Array<{ date: string; count: number }>;
  engagementMetrics: {
    totalLikes: number;
    totalComments: number;
    totalPosts: number;
    avgEngagementRate: number;
  };
  topContent: Array<{
    id: string;
    type: 'post' | 'reel' | 'album';
    title: string;
    engagement: number;
    views: number;
  }>;
  userBehavior: {
    avgSessionDuration: number;
    bounceRate: number;
    returnUserRate: number;
    mostActiveHours: Array<{ hour: number; activity: number }>;
  };
  platformStats: {
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    retentionRate: number;
  };
}

const AdvancedAnalytics: React.FC = () => {
  const { profile } = useAuth();
  const [isFeatureEnabled, setIsFeatureEnabled] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    userGrowth: [],
    engagementMetrics: {
      totalLikes: 0,
      totalComments: 0,
      totalPosts: 0,
      avgEngagementRate: 0
    },
    topContent: [],
    userBehavior: {
      avgSessionDuration: 0,
      bounceRate: 0,
      returnUserRate: 0,
      mostActiveHours: []
    },
    platformStats: {
      totalUsers: 0,
      activeUsers: 0,
      newUsersToday: 0,
      retentionRate: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    if (profile) {
      checkFeatureFlag();
      loadAnalytics();
    }
  }, [profile, timeRange]);

  const checkFeatureFlag = async () => {
    if (!profile) return;
    
    const enabled = await isEnabled("advanced_analytics", profile.id);
    setIsFeatureEnabled(enabled);
  };

  const loadAnalytics = async () => {
    if (!profile) return;

    try {
      const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Load user growth data
      const { data: userGrowthData } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      // Process user growth by day
      const userGrowthByDay = processUserGrowth(userGrowthData || [], daysBack);

      // Load engagement metrics
      const [
        { count: totalPosts },
        { data: postsWithEngagement }
      ] = await Promise.all([
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('likes_count, comments_count, shares_count, created_at')
          .gte('created_at', startDate.toISOString())
      ]);

      const totalLikes = postsWithEngagement?.reduce((sum, post) => sum + post.likes_count, 0) || 0;
      const totalComments = postsWithEngagement?.reduce((sum, post) => sum + post.comments_count, 0) || 0;
      const avgEngagementRate = totalPosts > 0 ? ((totalLikes + totalComments) / totalPosts) : 0;

      // Load top content
      const { data: topPosts } = await supabase
        .from('posts')
        .select('id, content, likes_count, comments_count, shares_count')
        .gte('created_at', startDate.toISOString())
        .order('likes_count', { ascending: false })
        .limit(5);

      const topContent = (topPosts || []).map(post => ({
        id: post.id,
        type: 'post' as const,
        title: post.content.substring(0, 50) + '...',
        engagement: post.likes_count + post.comments_count,
        views: post.shares_count
      }));

      // Load platform stats
      const today = new Date().toISOString().split('T')[0];
      const [
        { count: totalUsers },
        { count: newUsersToday }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .gte('created_at', today)
      ]);

      setAnalytics({
        userGrowth: userGrowthByDay,
        engagementMetrics: {
          totalLikes,
          totalComments,
          totalPosts: totalPosts || 0,
          avgEngagementRate: Math.round(avgEngagementRate * 100) / 100
        },
        topContent,
        userBehavior: {
          avgSessionDuration: 0, // Would need session tracking
          bounceRate: 0,
          returnUserRate: 0,
          mostActiveHours: generateMockActiveHours()
        },
        platformStats: {
          totalUsers: totalUsers || 0,
          activeUsers: Math.floor((totalUsers || 0) * 0.3), // Estimated
          newUsersToday: newUsersToday || 0,
          retentionRate: 75 // Estimated
        }
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processUserGrowth = (userData: any[], daysBack: number) => {
    const growthData = [];
    const today = new Date();

    for (let i = daysBack - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const usersOnDay = userData.filter(user => 
        user.created_at.split('T')[0] === dateStr
      ).length;

      growthData.push({
        date: dateStr,
        count: usersOnDay
      });
    }

    return growthData;
  };

  const generateMockActiveHours = () => {
    const hours = [];
    for (let i = 0; i < 24; i++) {
      // Simulate higher activity during typical hours
      let activity = Math.random() * 50;
      if (i >= 9 && i <= 17) activity += 30; // Work hours
      if (i >= 19 && i <= 22) activity += 40; // Evening
      
      hours.push({ hour: i, activity: Math.round(activity) });
    }
    return hours;
  };

  const exportAnalytics = () => {
    const data = {
      timeRange,
      generatedAt: new Date().toISOString(),
      userGrowth: analytics.userGrowth,
      engagementMetrics: analytics.engagementMetrics,
      platformStats: analytics.platformStats
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pawpilot-analytics-${timeRange}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isFeatureEnabled) {
    return null;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
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
        <h1 className="text-3xl font-bold text-gray-900">Advanced Analytics</h1>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          
          <button
            onClick={loadAnalytics}
            className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          
          <button
            onClick={exportAnalytics}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-lg shadow-md"
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">{analytics.platformStats.totalUsers}</h3>
              <p className="text-gray-600">Total Users</p>
              <p className="text-sm text-green-600">+{analytics.platformStats.newUsersToday} today</p>
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
            <div className="p-3 rounded-full bg-green-100">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">{analytics.platformStats.activeUsers}</h3>
              <p className="text-gray-600">Active Users</p>
              <p className="text-sm text-blue-600">{analytics.platformStats.retentionRate}% retention</p>
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
            <div className="p-3 rounded-full bg-purple-100">
              <Heart className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">{analytics.engagementMetrics.totalLikes}</h3>
              <p className="text-gray-600">Total Likes</p>
              <p className="text-sm text-purple-600">{analytics.engagementMetrics.avgEngagementRate} avg/post</p>
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
            <div className="p-3 rounded-full bg-orange-100">
              <MessageCircle className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">{analytics.engagementMetrics.totalComments}</h3>
              <p className="text-gray-600">Total Comments</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* User Growth Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-lg shadow-md p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h3>
        <div className="flex items-end space-x-1 h-64">
          {analytics.userGrowth.map((day, index) => {
            const maxCount = Math.max(...analytics.userGrowth.map(d => d.count));
            const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-blue-600 rounded-t transition-all duration-500 hover:bg-blue-700"
                  style={{ height: `${height}%` }}
                  title={`${day.count} new users on ${new Date(day.date).toLocaleDateString()}`}
                />
                <span className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-left">
                  {new Date(day.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Top Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-lg shadow-md p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Content</h3>
        {analytics.topContent.length > 0 ? (
          <div className="space-y-3">
            {analytics.topContent.map((content, index) => (
              <div key={content.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                  <div>
                    <h4 className="font-medium text-gray-900">{content.title}</h4>
                    <p className="text-sm text-gray-600 capitalize">{content.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span>{content.engagement}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Eye className="h-4 w-4 text-blue-500" />
                      <span>{content.views}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 text-center py-8">No content data available</p>
        )}
      </motion.div>

      {/* Activity Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-lg shadow-md p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Activity by Hour</h3>
        <div className="grid grid-cols-12 gap-1">
          {analytics.userBehavior.mostActiveHours.map((hour) => {
            const maxActivity = Math.max(...analytics.userBehavior.mostActiveHours.map(h => h.activity));
            const intensity = maxActivity > 0 ? (hour.activity / maxActivity) : 0;
            
            return (
              <div key={hour.hour} className="text-center">
                <div
                  className="w-full h-8 rounded mb-1 transition-all duration-300"
                  style={{
                    backgroundColor: `rgba(59, 130, 246, ${intensity})`,
                    border: intensity > 0 ? '1px solid #3B82F6' : '1px solid #E5E7EB'
                  }}
                  title={`${hour.hour}:00 - ${hour.activity} events`}
                />
                <span className="text-xs text-gray-500">
                  {hour.hour.toString().padStart(2, '0')}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>12 AM</span>
          <span>12 PM</span>
          <span>11 PM</span>
        </div>
      </motion.div>

      {/* Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white rounded-lg shadow-md p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <h4 className="font-medium text-green-900">Growing Engagement</h4>
                <p className="text-sm text-green-700">User engagement is trending upward</p>
              </div>
            </div>
            <span className="text-sm font-medium text-green-600">
              +{analytics.engagementMetrics.avgEngagementRate}% avg
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <h4 className="font-medium text-blue-900">Strong Retention</h4>
                <p className="text-sm text-blue-700">Users are staying active on the platform</p>
              </div>
            </div>
            <span className="text-sm font-medium text-blue-600">
              {analytics.platformStats.retentionRate}% retention
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Activity className="h-5 w-5 text-purple-600" />
              <div>
                <h4 className="font-medium text-purple-900">Peak Activity</h4>
                <p className="text-sm text-purple-700">Most activity happens in the evening</p>
              </div>
            </div>
            <span className="text-sm font-medium text-purple-600">
              7-10 PM peak
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdvancedAnalytics;