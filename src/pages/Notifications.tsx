import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { 
  Bell, Heart, MessageCircle, Users, Calendar, MapPin, 
  UserPlus, Check, CheckCheck, Trash2, Settings,
  Filter, Search, X, AlertTriangle, Info, Gift
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

interface Notification {
  id: string;
  user_id: string;
  type: 'like' | 'comment' | 'message' | 'follow' | 'event' | 'lost_found' | 'group_invite';
  title: string;
  message: string;
  related_id?: string;
  from_user_id?: string;
  read_at?: string;
  created_at: string;
  from_user?: {
    display_name: string;
    avatar_url?: string;
  };
}

const Notifications: React.FC = () => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const notificationTypes = [
    { value: 'all', label: 'All Types', icon: Bell },
    { value: 'like', label: 'Likes', icon: Heart },
    { value: 'comment', label: 'Comments', icon: MessageCircle },
    { value: 'follow', label: 'Follows', icon: UserPlus },
    { value: 'message', label: 'Messages', icon: MessageCircle },
    { value: 'event', label: 'Events', icon: Calendar },
    { value: 'lost_found', label: 'Lost & Found', icon: MapPin },
    { value: 'group_invite', label: 'Group Invites', icon: Users }
  ];

  useEffect(() => {
    if (profile) {
      loadNotifications();
      // Set up real-time subscription for new notifications
      const subscription = supabase
        .channel('notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`
        }, (payload) => {
          loadNotifications(); // Reload to get complete notification data
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [profile]);

  const loadNotifications = async () => {
    if (!profile) return;

    try {
      let query = supabase
        .from('notifications')
        .select(`
          *,
          profiles!notifications_from_user_id_fkey(display_name, avatar_url)
        `)
        .eq('user_id', profile.id);

      // Apply filters
      if (filter === 'unread') {
        query = query.is('read_at', null);
      } else if (filter === 'read') {
        query = query.not('read_at', 'is', null);
      }

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error loading notifications:', error);
        toast.error('Failed to load notifications');
      } else {
        const notificationsWithFromUser = (data || []).map(notification => ({
          ...notification,
          from_user: notification.profiles
        }));
        setNotifications(notificationsWithFromUser);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationIds: string[]) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', notificationIds)
        .eq('user_id', profile?.id);

      if (error) {
        console.error('Error marking notifications as read:', error);
        toast.error('Failed to mark as read');
      } else {
        loadNotifications();
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  const markAsUnread = async (notificationIds: string[]) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: null })
        .in('id', notificationIds)
        .eq('user_id', profile?.id);

      if (error) {
        console.error('Error marking notifications as unread:', error);
        toast.error('Failed to mark as unread');
      } else {
        loadNotifications();
      }
    } catch (error) {
      console.error('Error marking notifications as unread:', error);
      toast.error('Failed to mark as unread');
    }
  };

  const deleteNotifications = async (notificationIds: string[]) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', notificationIds)
        .eq('user_id', profile?.id);

      if (error) {
        console.error('Error deleting notifications:', error);
        toast.error('Failed to delete notifications');
      } else {
        toast.success(`${notificationIds.length} notification${notificationIds.length !== 1 ? 's' : ''} deleted`);
        setSelectedNotifications([]);
        setShowBulkActions(false);
        loadNotifications();
      }
    } catch (error) {
      console.error('Error deleting notifications:', error);
      toast.error('Failed to delete notifications');
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications
      .filter(n => !n.read_at)
      .map(n => n.id);
    
    if (unreadNotifications.length > 0) {
      await markAsRead(unreadNotifications);
      toast.success('All notifications marked as read');
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read_at) {
      await markAsRead([notification.id]);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'like':
      case 'comment':
        if (notification.related_id) {
          // Navigate to post (would need post detail page)
          window.location.href = `/feed#post-${notification.related_id}`;
        }
        break;
      case 'message':
        window.location.href = '/messages';
        break;
      case 'follow':
        if (notification.from_user_id) {
          // Navigate to user profile (would need profile page)
          window.location.href = `/profile/${notification.from_user_id}`;
        }
        break;
      case 'event':
        if (notification.related_id) {
          window.location.href = `/events#event-${notification.related_id}`;
        }
        break;
      case 'lost_found':
        if (notification.related_id) {
          window.location.href = `/lostfound#report-${notification.related_id}`;
        }
        break;
      case 'group_invite':
        if (notification.related_id) {
          window.location.href = `/groups#group-${notification.related_id}`;
        }
        break;
    }
  };

  const getNotificationIcon = (type: string) => {
    const typeConfig = notificationTypes.find(t => t.value === type);
    return typeConfig?.icon || Bell;
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'like': return 'text-red-500';
      case 'comment': return 'text-blue-500';
      case 'follow': return 'text-green-500';
      case 'message': return 'text-purple-500';
      case 'event': return 'text-orange-500';
      case 'lost_found': return 'text-red-600';
      case 'group_invite': return 'text-indigo-500';
      default: return 'text-gray-500';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    
    return date.toLocaleDateString();
  };

  const toggleNotificationSelection = (notificationId: string) => {
    setSelectedNotifications(prev => {
      const newSelection = prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId];
      
      setShowBulkActions(newSelection.length > 0);
      return newSelection;
    });
  };

  const selectAllNotifications = () => {
    const allIds = filteredNotifications.map(n => n.id);
    setSelectedNotifications(allIds);
    setShowBulkActions(true);
  };

  const deselectAllNotifications = () => {
    setSelectedNotifications([]);
    setShowBulkActions(false);
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = searchTerm === '' || 
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.from_user?.display_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const unreadCount = notifications.filter(n => !n.read_at).length;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600 mt-2">
            Stay updated with your pet community activities
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {unreadCount} unread
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              Mark all as read
            </button>
          )}
          <Link
            to="/settings"
            className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
            title="Notification settings"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
          {/* Read/Unread Filter */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'read'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Read ({notifications.length - unreadCount})
            </button>
          </div>

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {notificationTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>

            {/* Search */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search notifications..."
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {showBulkActions && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-blue-900">
                  {selectedNotifications.length} notification{selectedNotifications.length !== 1 ? 's' : ''} selected
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={selectAllNotifications}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Select all
                  </button>
                  <button
                    onClick={deselectAllNotifications}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Deselect all
                  </button>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => markAsRead(selectedNotifications)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  Mark as read
                </button>
                <button
                  onClick={() => markAsUnread(selectedNotifications)}
                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                >
                  Mark as unread
                </button>
                <button
                  onClick={() => deleteNotifications(selectedNotifications)}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications List */}
      {filteredNotifications.length > 0 ? (
        <div className="space-y-2">
          {filteredNotifications.map((notification, index) => {
            const NotificationIcon = getNotificationIcon(notification.type);
            const isSelected = selectedNotifications.includes(notification.id);
            
            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white rounded-lg shadow-sm border transition-all hover:shadow-md ${
                  !notification.read_at ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'
                } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className="p-4">
                  <div className="flex items-start space-x-4">
                    {/* Selection Checkbox */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleNotificationSelection(notification.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>

                    {/* Notification Icon */}
                    <div className={`p-2 rounded-full bg-gray-100 ${getNotificationColor(notification.type)}`}>
                      <NotificationIcon className="h-4 w-4" />
                    </div>

                    {/* From User Avatar */}
                    {notification.from_user && (
                      <div className="flex-shrink-0">
                        {notification.from_user.avatar_url ? (
                          <img
                            src={notification.from_user.avatar_url}
                            alt={notification.from_user.display_name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                            <Users className="h-4 w-4 text-gray-600" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notification Content */}
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className={`font-medium ${!notification.read_at ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          {!notification.read_at && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          )}
                        </div>
                      </div>
                      <p className={`text-sm mt-1 ${!notification.read_at ? 'text-gray-700' : 'text-gray-600'}`}>
                        {notification.message}
                      </p>
                    </div>

                    {/* Individual Actions */}
                    <div className="flex items-center space-x-1">
                      {!notification.read_at ? (
                        <button
                          onClick={() => markAsRead([notification.id])}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => markAsUnread([notification.id])}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Mark as unread"
                        >
                          <Bell className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotifications([notification.id])}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete notification"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            {filter === 'unread' ? 'No unread notifications' : 
             filter === 'read' ? 'No read notifications' :
             searchTerm ? 'No notifications match your search' : 'No notifications yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {filter === 'unread' ? 'You\'re all caught up! Check back later for new updates.' :
             filter === 'read' ? 'No notifications have been read yet.' :
             searchTerm ? 'Try adjusting your search terms or filters.' :
             'When you receive notifications, they\'ll appear here.'}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear search
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;