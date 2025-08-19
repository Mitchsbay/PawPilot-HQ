import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase, ActivityFeedItem } from '../../lib/supabase';
import { 
  Heart, MessageCircle, Users, Calendar, Camera, 
  User, Edit, Plus, Activity, Award
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface ActivityFeedProps {
  userId: string;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ userId }) => {
  const { profile } = useAuth();
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadActivities();
  }, [userId]);

  const loadActivities = async (offset = 0) => {
    try {
      const { data, error } = await supabase
        .from('activity_feed')
        .select(`
          *,
          profiles!activity_feed_actor_id_fkey(id, display_name, avatar_url)
        `)
        .eq('subject_user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + 19);

      if (error) {
        console.error('Error loading activities:', error);
        return;
      }

      const activitiesWithProfiles = (data || []).map(activity => ({
        ...activity,
        actor_profile: activity.profiles
      }));

      if (offset === 0) {
        setActivities(activitiesWithProfiles);
      } else {
        setActivities(prev => [...prev, ...activitiesWithProfiles]);
      }

      setHasMore((data || []).length === 20);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      loadActivities(activities.length);
    }
  };

  const getActivityIcon = (verb: string, objectType: string) => {
    switch (verb) {
      case 'posted':
        return objectType === 'reel' ? Camera : MessageCircle;
      case 'commented':
        return MessageCircle;
      case 'liked':
        return Heart;
      case 'joined_group':
        return Users;
      case 'created_event':
        return Calendar;
      case 'added_pet':
        return Heart;
      case 'updated_profile':
        return User;
      case 'uploaded_photos':
        return Camera;
      default:
        return Activity;
    }
  };

  const getActivityColor = (verb: string) => {
    switch (verb) {
      case 'posted':
        return 'text-blue-600';
      case 'commented':
        return 'text-green-600';
      case 'liked':
        return 'text-red-600';
      case 'joined_group':
        return 'text-purple-600';
      case 'created_event':
        return 'text-orange-600';
      case 'added_pet':
        return 'text-pink-600';
      case 'updated_profile':
        return 'text-indigo-600';
      case 'uploaded_photos':
        return 'text-teal-600';
      default:
        return 'text-gray-600';
    }
  };

  const getActivityText = (activity: ActivityFeedItem) => {
    const actorName = activity.actor_profile?.display_name || 'Someone';
    
    switch (activity.verb) {
      case 'posted':
        return `${actorName} shared a new ${activity.object_type}`;
      case 'commented':
        return `${actorName} commented on a ${activity.object_type}`;
      case 'liked':
        return `${actorName} liked a ${activity.object_type}`;
      case 'joined_group':
        return `${actorName} joined a group`;
      case 'created_event':
        return `${actorName} created an event`;
      case 'added_pet':
        return `${actorName} added a new pet`;
      case 'updated_profile':
        return `${actorName} updated their profile`;
      case 'uploaded_photos':
        return `${actorName} uploaded new photos`;
      default:
        return `${actorName} ${activity.verb} a ${activity.object_type}`;
    }
  };

  const getActivityLink = (activity: ActivityFeedItem) => {
    switch (activity.object_type) {
      case 'post':
        return `/feed#post-${activity.object_id}`;
      case 'group':
        return `/groups#group-${activity.object_id}`;
      case 'event':
        return `/events#event-${activity.object_id}`;
      case 'pet':
        return `/pets#pet-${activity.object_id}`;
      case 'photo':
        return `/photos#photo-${activity.object_id}`;
      default:
        return null;
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
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-4 animate-pulse">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.length > 0 ? (
        <>
          {activities.map((activity, index) => {
            const ActivityIcon = getActivityIcon(activity.verb, activity.object_type);
            const activityLink = getActivityLink(activity);
            
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center space-x-3 p-4 hover:bg-gray-50 rounded-lg transition-colors"
              >
                {/* Actor Avatar */}
                <div className="flex-shrink-0">
                  {activity.actor_profile?.avatar_url ? (
                    <img
                      src={activity.actor_profile.avatar_url}
                      alt={activity.actor_profile.display_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                  )}
                </div>

                {/* Activity Icon */}
                <div className={`p-2 rounded-full bg-gray-100 ${getActivityColor(activity.verb)}`}>
                  <ActivityIcon className="h-4 w-4" />
                </div>

                {/* Activity Content */}
                <div className="flex-1 min-w-0">
                  {activityLink ? (
                    <Link
                      to={activityLink}
                      className="block hover:text-blue-600 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-900">
                        {getActivityText(activity)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTimeAgo(activity.created_at)}
                      </p>
                    </Link>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-900">
                        {getActivityText(activity)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTimeAgo(activity.created_at)}
                      </p>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* Load More */}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h3>
          <p className="text-gray-600">
            {userId === profile?.id 
              ? 'Your activity will appear here as you use PawPilot HQ'
              : 'This user\'s activity will appear here'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;