import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { 
  Bell, Calendar, Heart, MessageCircle, Users, 
  MapPin, Gift, Activity, CheckCircle, AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface ActivityItem {
  id: string;
  type: 'welcome' | 'health_reminder' | 'event_reminder' | 'follow' | 'like' | 'comment' | 'lost_found';
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  link?: string;
  timestamp: string;
}

const RecentActivity: React.FC = () => {
  const { profile } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      loadRecentActivity();
    }
  }, [profile]);

  const loadRecentActivity = async () => {
    if (!profile) return;

    try {
      const activities: ActivityItem[] = [];

      // Welcome message for new users
      const joinDate = new Date(profile.created_at);
      const daysSinceJoin = Math.floor((new Date().getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceJoin <= 7) {
        activities.push({
          id: 'welcome',
          type: 'welcome',
          title: 'Welcome to PawPilot HQ!',
          description: 'Complete your profile to get the most out of our platform',
          icon: Bell,
          color: 'text-blue-600',
          link: '/settings',
          timestamp: profile.created_at
        });
      }

      // Health reminders
      const { data: pets } = await supabase
        .from('pets')
        .select('id, name')
        .eq('owner_id', profile.id);

      if (pets && pets.length > 0) {
        activities.push({
          id: 'health_reminder',
          type: 'health_reminder',
          title: 'Health Reminder',
          description: "Don't forget to log your pets' health records regularly",
          icon: Calendar,
          color: 'text-green-600',
          link: '/health',
          timestamp: new Date().toISOString()
        });
      }

      // Recent notifications
      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (notifications) {
        notifications.forEach(notification => {
          let icon = Bell;
          let color = 'text-gray-600';
          
          switch (notification.type) {
            case 'like':
              icon = Heart;
              color = 'text-red-600';
              break;
            case 'comment':
              icon = MessageCircle;
              color = 'text-blue-600';
              break;
            case 'follow':
              icon = Users;
              color = 'text-green-600';
              break;
            case 'event':
              icon = Calendar;
              color = 'text-purple-600';
              break;
            case 'lost_found':
              icon = MapPin;
              color = 'text-orange-600';
              break;
          }

          activities.push({
            id: notification.id,
            type: notification.type as any,
            title: notification.title,
            description: notification.message,
            icon,
            color,
            timestamp: notification.created_at
          });
        });
      }

      // Sort by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setActivities(activities.slice(0, 5)); // Show max 5 items
    } catch (error) {
      console.error('Error loading recent activity:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4 animate-pulse"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h2>
      
      {activities.length > 0 ? (
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-start space-x-3 p-4 rounded-lg ${
                activity.type === 'welcome' ? 'bg-blue-50' :
                activity.type === 'health_reminder' ? 'bg-green-50' :
                'bg-gray-50'
              }`}
            >
              <div className={`p-2 rounded-full ${
                activity.type === 'welcome' ? 'bg-blue-100' :
                activity.type === 'health_reminder' ? 'bg-green-100' :
                'bg-gray-100'
              }`}>
                <activity.icon className={`h-5 w-5 ${activity.color}`} />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{activity.title}</h3>
                <p className="text-sm text-gray-600">{activity.description}</p>
                {activity.link && (
                  <Link
                    to={activity.link}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-1 inline-block"
                  >
                    Take action →
                  </Link>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
          <p className="text-gray-600">
            Your activity and updates will appear here
          </p>
        </div>
      )}
    </div>
  );
};

export default RecentActivity;