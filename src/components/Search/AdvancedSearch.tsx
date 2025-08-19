import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { 
  Search, Filter, X, Calendar, MapPin, Users, Heart, 
  Camera, MessageCircle, SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface SearchFilters {
  query: string;
  contentType: 'all' | 'users' | 'pets' | 'posts' | 'groups' | 'events';
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year';
  location: string;
  species: string;
  sortBy: 'relevance' | 'recent' | 'popular' | 'alphabetical';
}

interface SearchResult {
  id: string;
  type: 'user' | 'pet' | 'post' | 'group' | 'event';
  title: string;
  subtitle?: string;
  description?: string;
  avatar_url?: string;
  created_at: string;
  relevance_score?: number;
}

interface AdvancedSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({ isOpen, onClose }) => {
  const { profile } = useAuth();
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    contentType: 'all',
    dateRange: 'all',
    location: '',
    species: '',
    sortBy: 'relevance'
  });
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (filters.query.trim().length >= 2) {
      performAdvancedSearch();
    } else {
      setResults([]);
    }
  }, [filters]);

  const performAdvancedSearch = async () => {
    if (!profile) return;

    setLoading(true);
    const searchResults: SearchResult[] = [];

    try {
      const query = filters.query.trim();
      const dateFilter = getDateFilter();

      // Search users
      if (filters.contentType === 'all' || filters.contentType === 'users') {
        const { data: users } = await supabase
          .from('profiles')
          .select('id, display_name, bio, avatar_url, created_at')
          .or(`display_name.ilike.%${query}%,bio.ilike.%${query}%`)
          .neq('id', profile.id)
          .gte('created_at', dateFilter)
          .limit(10);

        if (users) {
          searchResults.push(...users.map(user => ({
            id: user.id,
            type: 'user' as const,
            title: user.display_name,
            subtitle: user.bio || 'User profile',
            avatar_url: user.avatar_url,
            created_at: user.created_at,
            relevance_score: calculateRelevance(query, user.display_name + ' ' + (user.bio || ''))
          })));
        }
      }

      // Search pets
      if (filters.contentType === 'all' || filters.contentType === 'pets') {
        let petQuery = supabase
          .from('pets')
          .select('id, name, species, breed, photo_url, created_at')
          .or(`name.ilike.%${query}%,breed.ilike.%${query}%`)
          .eq('visibility', 'public')
          .gte('created_at', dateFilter);

        if (filters.species) {
          petQuery = petQuery.eq('species', filters.species);
        }

        const { data: pets } = await petQuery.limit(10);

        if (pets) {
          searchResults.push(...pets.map(pet => ({
            id: pet.id,
            type: 'pet' as const,
            title: pet.name,
            subtitle: `${pet.species}${pet.breed ? ` • ${pet.breed}` : ''}`,
            avatar_url: pet.photo_url,
            created_at: pet.created_at,
            relevance_score: calculateRelevance(query, pet.name + ' ' + (pet.breed || ''))
          })));
        }
      }

      // Search posts
      if (filters.contentType === 'all' || filters.contentType === 'posts') {
        const { data: posts } = await supabase
          .from('posts')
          .select('id, content, author_id, created_at, likes_count, comments_count, profiles!posts_author_id_fkey(display_name, avatar_url)')
          .ilike('content', `%${query}%`)
          .eq('visibility', 'public')
          .gte('created_at', dateFilter)
          .limit(10);

        if (posts) {
          searchResults.push(...posts.map(post => ({
            id: post.id,
            type: 'post' as const,
            title: post.content.substring(0, 60) + (post.content.length > 60 ? '...' : ''),
            subtitle: `by ${post.profiles?.display_name}`,
            description: `${post.likes_count} likes • ${post.comments_count} comments`,
            avatar_url: post.profiles?.avatar_url,
            created_at: post.created_at,
            relevance_score: calculateRelevance(query, post.content)
          })));
        }
      }

      // Search groups
      if (filters.contentType === 'all' || filters.contentType === 'groups') {
        const { data: groups } = await supabase
          .from('groups')
          .select('id, name, description, avatar_url, members_count, created_at')
          .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
          .eq('is_private', false)
          .gte('created_at', dateFilter)
          .limit(10);

        if (groups) {
          searchResults.push(...groups.map(group => ({
            id: group.id,
            type: 'group' as const,
            title: group.name,
            subtitle: `${group.members_count} members`,
            description: group.description,
            avatar_url: group.avatar_url,
            created_at: group.created_at,
            relevance_score: calculateRelevance(query, group.name + ' ' + (group.description || ''))
          })));
        }
      }

      // Search events
      if (filters.contentType === 'all' || filters.contentType === 'events') {
        let eventQuery = supabase
          .from('events')
          .select('id, title, description, start_datetime, location, created_at')
          .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
          .eq('is_private', false)
          .gte('created_at', dateFilter);

        if (filters.location) {
          eventQuery = eventQuery.ilike('location', `%${filters.location}%`);
        }

        const { data: events } = await eventQuery.limit(10);

        if (events) {
          searchResults.push(...events.map(event => ({
            id: event.id,
            type: 'event' as const,
            title: event.title,
            subtitle: new Date(event.start_datetime).toLocaleDateString(),
            description: event.location,
            created_at: event.created_at,
            relevance_score: calculateRelevance(query, event.title + ' ' + (event.description || ''))
          })));
        }
      }

      // Sort results
      const sortedResults = sortResults(searchResults);
      setResults(sortedResults);
    } catch (error) {
      console.error('Error performing advanced search:', error);
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const calculateRelevance = (query: string, text: string): number => {
    const lowerQuery = query.toLowerCase();
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes(lowerQuery)) {
      const index = lowerText.indexOf(lowerQuery);
      return 100 - index; // Earlier matches get higher scores
    }
    
    return 0;
  };

  const getDateFilter = (): string => {
    const now = new Date();
    switch (filters.dateRange) {
      case 'today':
        return new Date(now.setHours(0, 0, 0, 0)).toISOString();
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return '1970-01-01T00:00:00.000Z';
    }
  };

  const sortResults = (results: SearchResult[]): SearchResult[] => {
    switch (filters.sortBy) {
      case 'recent':
        return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'alphabetical':
        return results.sort((a, b) => a.title.localeCompare(b.title));
      case 'relevance':
      default:
        return results.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'user': return Users;
      case 'pet': return Heart;
      case 'post': return Camera;
      case 'group': return Users;
      case 'event': return Calendar;
      default: return Search;
    }
  };

  const getResultColor = (type: string) => {
    switch (type) {
      case 'user': return 'text-blue-600';
      case 'pet': return 'text-pink-600';
      case 'post': return 'text-green-600';
      case 'group': return 'text-purple-600';
      case 'event': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case 'user':
        window.location.href = `/profile/${result.id}`;
        break;
      case 'pet':
        window.location.href = `/pets#pet-${result.id}`;
        break;
      case 'post':
        window.location.href = `/feed#post-${result.id}`;
        break;
      case 'group':
        window.location.href = `/groups#group-${result.id}`;
        break;
      case 'event':
        window.location.href = `/events#event-${result.id}`;
        break;
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-start justify-center min-h-full p-4 pt-20">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50"
          />

          {/* Search Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4"
          >
            {/* Search Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={filters.query}
                    onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                    placeholder="Search users, pets, posts, groups, and events..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-3 rounded-lg transition-colors ${
                    showFilters ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <SlidersHorizontal className="h-5 w-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-3 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Advanced Filters */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Content Type
                      </label>
                      <select
                        value={filters.contentType}
                        onChange={(e) => setFilters(prev => ({ ...prev, contentType: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Content</option>
                        <option value="users">Users</option>
                        <option value="pets">Pets</option>
                        <option value="posts">Posts</option>
                        <option value="groups">Groups</option>
                        <option value="events">Events</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date Range
                      </label>
                      <select
                        value={filters.dateRange}
                        onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="year">This Year</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sort By
                      </label>
                      <select
                        value={filters.sortBy}
                        onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="relevance">Relevance</option>
                        <option value="recent">Most Recent</option>
                        <option value="popular">Most Popular</option>
                        <option value="alphabetical">Alphabetical</option>
                      </select>
                    </div>

                    {(filters.contentType === 'all' || filters.contentType === 'pets') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Pet Species
                        </label>
                        <select
                          value={filters.species}
                          onChange={(e) => setFilters(prev => ({ ...prev, species: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">All Species</option>
                          <option value="dog">Dogs</option>
                          <option value="cat">Cats</option>
                          <option value="bird">Birds</option>
                          <option value="rabbit">Rabbits</option>
                          <option value="hamster">Hamsters</option>
                          <option value="fish">Fish</option>
                          <option value="reptile">Reptiles</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    )}

                    {(filters.contentType === 'all' || filters.contentType === 'events') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Location
                        </label>
                        <input
                          type="text"
                          value={filters.location}
                          onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="Enter location..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Search Results */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Searching...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="py-2">
                  {results.map((result, index) => {
                    const ResultIcon = getResultIcon(result.type);
                    
                    return (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleResultClick(result)}
                        className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        {result.avatar_url ? (
                          <img
                            src={result.avatar_url}
                            alt={result.title}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                            <ResultIcon className="h-6 w-6 text-gray-600" />
                          </div>
                        )}
                        
                        <div className="flex-1 text-left">
                          <h3 className="font-medium text-gray-900">{result.title}</h3>
                          <p className="text-sm text-gray-600">{result.subtitle}</p>
                          {result.description && (
                            <p className="text-xs text-gray-500 mt-1">{result.description}</p>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs px-2 py-1 rounded-full bg-gray-100 ${getResultColor(result.type)}`}>
                            {result.type}
                          </span>
                          {filters.sortBy === 'relevance' && result.relevance_score && (
                            <span className="text-xs text-gray-400">
                              {Math.round(result.relevance_score)}%
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : filters.query.length >= 2 ? (
                <div className="p-8 text-center">
                  <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                  <p className="text-gray-600">
                    Try different keywords or adjust your filters
                  </p>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Advanced Search</h3>
                  <p className="text-gray-600">
                    Use filters to find exactly what you're looking for
                  </p>
                </div>
              )}
            </div>

            {/* Search Stats */}
            {results.length > 0 && (
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-600 text-center">
                  Found {results.length} result{results.length !== 1 ? 's' : ''} for "{filters.query}"
                  {filters.contentType !== 'all' && ` in ${filters.contentType}`}
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default AdvancedSearch;