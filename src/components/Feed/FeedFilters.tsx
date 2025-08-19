import React from 'react';
import { Filter, TrendingUp, Clock, Heart, Users } from 'lucide-react';

interface FeedFiltersProps {
  sortBy: 'recent' | 'popular' | 'following';
  onSortChange: (sort: 'recent' | 'popular' | 'following') => void;
  showFollowingOnly: boolean;
  onFollowingToggle: (show: boolean) => void;
  className?: string;
}

const FeedFilters: React.FC<FeedFiltersProps> = ({
  sortBy,
  onSortChange,
  showFollowingOnly,
  onFollowingToggle,
  className = ''
}) => {
  const sortOptions = [
    { value: 'recent', label: 'Recent', icon: Clock },
    { value: 'popular', label: 'Popular', icon: TrendingUp },
    { value: 'following', label: 'Following', icon: Users }
  ];

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Sort by:</span>
        </div>
        
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onSortChange(option.value as any)}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                sortBy === option.value
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <option.icon className="h-3 w-3" />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeedFilters;