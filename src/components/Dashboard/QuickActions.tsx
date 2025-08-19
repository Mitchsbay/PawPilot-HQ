import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Plus, Camera, Activity, Calendar, Users, MapPin, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  href: string;
}

const QuickActions: React.FC = () => {
  const quickActions: QuickAction[] = [
    {
      title: 'Add New Pet',
      description: 'Register a new pet profile',
      icon: Heart,
      color: 'bg-pink-500',
      href: '/pets?action=add'
    },
    {
      title: 'Quick Post',
      description: 'Share something with the community',
      icon: Camera,
      color: 'bg-blue-500',
      href: '/feed?action=post'
    },
    {
      title: 'Health Check',
      description: 'Log a health record',
      icon: Activity,
      color: 'bg-green-500',
      href: '/health?action=add'
    },
    {
      title: 'Find Events',
      description: 'Discover pet events nearby',
      icon: Calendar,
      color: 'bg-purple-500',
      href: '/events'
    },
    {
      title: 'Join Groups',
      description: 'Connect with pet communities',
      icon: Users,
      color: 'bg-indigo-500',
      href: '/groups'
    },
    {
      title: 'Lost & Found',
      description: 'Report or search for pets',
      icon: MapPin,
      color: 'bg-red-500',
      href: '/lostfound'
    },
    {
      title: 'Messages',
      description: 'Chat with other pet parents',
      icon: MessageCircle,
      color: 'bg-teal-500',
      href: '/messages'
    },
    {
      title: 'Create Album',
      description: 'Organize your pet photos',
      icon: Camera,
      color: 'bg-orange-500',
      href: '/photos'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quickActions.map((action, index) => (
          <motion.div
            key={action.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link
              to={action.href}
              className="block p-4 border border-gray-200 rounded-lg hover:shadow-md hover:border-gray-300 transition-all group"
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${action.color} group-hover:scale-110 transition-transform`}>
                  <action.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;