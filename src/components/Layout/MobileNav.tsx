import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, Heart, MessageCircle, Users, Calendar, 
  MapPin, Settings, Bell
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { motion } from 'framer-motion';

const MobileNav: React.FC = () => {
  const { profile } = useAuth();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: Heart, label: 'Pets', path: '/pets' },
    { icon: MessageCircle, label: 'Messages', path: '/messages' },
    { icon: Users, label: 'Groups', path: '/groups' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const isPublicPage = location.pathname === '/' || location.pathname.startsWith('/auth');

  if (isPublicPage || !profile) {
    return null;
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item, index) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center space-y-1 transition-colors ${
              location.pathname === item.path
                ? 'text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <motion.div
              whileTap={{ scale: 0.95 }}
              className={`p-1 rounded-lg ${
                location.pathname === item.path ? 'bg-blue-50' : ''
              }`}
            >
              <item.icon className="h-5 w-5" />
            </motion.div>
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default MobileNav;