import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Bell, Menu, User, Settings, HelpCircle, LogOut, Home, Users, Calendar, 
  MessageCircle, Heart, Camera, MapPin, Shield, Gift, Search, Filter 
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import GlobalSearch from '../Search/GlobalSearch';
import AdvancedSearch from '../Search/AdvancedSearch';
import OnlineIndicator from '../UI/OnlineIndicator';
import NotificationBell from '../Notifications/NotificationBell';
import { supabase } from '../../lib/supabase';

const Header: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  // Load unread notifications count
  React.useEffect(() => {
    if (profile) {
      loadUnreadCount();
      
      // Set up real-time subscription for notification updates
      const subscription = supabase
        .channel('header-notifications')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`
        }, () => {
          loadUnreadCount();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [profile]);

  const loadUnreadCount = async () => {
    if (!profile) return;

    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .is('read_at', null);

      if (!error) {
        setUnreadCount(count || 0);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const isPublicPage = location.pathname === '/' || location.pathname.startsWith('/auth');

  if (isPublicPage) {
    return null; // Public pages handle their own navigation
  }

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: Heart, label: 'My Pets', path: '/pets' },
    { icon: Shield, label: 'Health', path: '/health' },
    { icon: Camera, label: 'Photos', path: '/photos' },
    { icon: Home, label: 'Feed', path: '/feed' },
    { icon: Camera, label: 'Reels', path: '/reels' },
    { icon: MessageCircle, label: 'Messages', path: '/messages' },
    { icon: Users, label: 'Groups', path: '/groups' },
    { icon: Calendar, label: 'Events', path: '/events' },
    { icon: MapPin, label: 'Lost & Found', path: '/lostfound' },
    { icon: Gift, label: 'Donations', path: '/donations' },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex-shrink-0">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">PawPilot HQ</span>
            </div>
          </Link>

          {/* Page Title - Center */}
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold text-gray-900">
              {location.pathname === '/dashboard' && 'Dashboard'}
              {location.pathname === '/pets' && 'My Pets'}
              {location.pathname === '/health' && 'Health Tracking'}
              {location.pathname === '/photos' && 'Photo Albums'}
              {location.pathname === '/feed' && 'Community Feed'}
              {location.pathname === '/reels' && 'Pet Reels'}
              {location.pathname === '/messages' && 'Messages'}
              {location.pathname === '/groups' && 'Groups'}
              {location.pathname === '/events' && 'Events'}
              {location.pathname === '/lostfound' && 'Lost & Found'}
              {location.pathname === '/notifications' && 'Notifications'}
              {location.pathname === '/settings' && 'Settings'}
              {location.pathname === '/donations' && 'Donations'}
              {location.pathname === '/help' && 'Help & Safety'}
              {location.pathname === '/admin' && 'Admin Panel'}
            </h1>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Search Button */}
            <div className="flex space-x-1">
              <button
                onClick={() => setShowSearch(true)}
                className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                title="Quick Search"
              >
                <Search className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowAdvancedSearch(true)}
                className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                title="Advanced Search"
              >
                <Filter className="h-5 w-5" />
              </button>
            </div>

            {/* Notifications */}
            {profile && <NotificationBell />}

            {/* Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="relative">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                  )}
                  {profile && (
                    <OnlineIndicator 
                      status="online"
                      size={8}
                      className="absolute -bottom-1 -right-1"
                    />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                  >
                    <Link
                      to="/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Link>
                    <Link
                      to="/help"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <HelpCircle className="h-4 w-4 mr-2" />
                      Help
                    </Link>
                    {profile?.role === 'super_admin' && (
                      <Link
                        to="/admin"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Admin Panel
                      </Link>
                    )}
                    <hr className="my-1" />
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="sm:hidden p-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="sm:hidden bg-white border-t border-gray-200"
          >
            <div className="px-4 py-2 space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setShowMobileMenu(false)}
                >
                  <item.icon className="h-4 w-4 mr-3" />
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Search Modal */}
      <GlobalSearch
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
      />

      {/* Advanced Search Modal */}
      <AdvancedSearch
        isOpen={showAdvancedSearch}
        onClose={() => setShowAdvancedSearch(false)}
      />
    </header>
  );
};

export default Header;