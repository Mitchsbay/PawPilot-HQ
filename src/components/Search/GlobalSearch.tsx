import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, Heart, Users, Calendar, Camera, MapPin } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  id: string;
  type: 'user' | 'pet' | 'group' | 'event' | 'post';
  title: string;
  subtitle?: string;
  avatar_url?: string;
  created_at?: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchTerm.trim().length >= 2) {
      performSearch(searchTerm.trim());
    } else {
      setResults([]);
    }
  }, [searchTerm]);

  const performSearch = async (query: string) => {
    if (!profile) return;

    setLoading(true);
    const searchResults: SearchResult[] = [];

    try {
      // Search users
      const { data: users } = await supabase
        .from('profiles')
        .select('id, display_name, bio, avatar_url')
        .or(`display_name.ilike.%${query}%,bio.ilike.%${query}%`)
        .neq('id', profile.id)
        .limit(5);

      if (users) {
        searchResults.push(...users.map(user => ({
          id: user.id,
          type: 'user' as const,
          title: user.display_name,
          subtitle: user.bio || 'User profile',
          avatar_url: user.avatar_url
        })));
      }

      // Search pets
      const { data: pets } = await supabase
        .from('pets')
        .select('id, name, species, breed, photo_url, owner_id')
        .or(`name.ilike.%${query}%,breed.ilike.%${query}%`)
        .eq('visibility', 'public')
        .limit(5);

      if (pets) {
        searchResults.push(...pets.map(pet => ({
          id: pet.id,
          type: 'pet' as const,
          title: pet.name,
          subtitle: `${pet.species}${pet.breed ? ` • ${pet.breed}` : ''}`,
          avatar_url: pet.photo_url
        })));
      }

      // Search groups
      const { data: groups } = await supabase
        .from('groups')
        .select('id, name, description, avatar_url, members_count')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .eq('is_private', false)
        .limit(5);

      if (groups) {
        searchResults.push(...groups.map(group => ({
          id: group.id,
          type: 'group' as const,
          title: group.name,
          subtitle: `${group.members_count} members`,
          avatar_url: group.avatar_url
        })));
      }

      // Search events
      const { data: events } = await supabase
        .from('events')
        .select('id, title, description, start_datetime')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .eq('is_private', false)
        .gte('start_datetime', new Date().toISOString())
        .limit(5);

      if (events) {
        searchResults.push(...events.map(event => ({
          id: event.id,
          type: 'event' as const,
          title: event.title,
          subtitle: new Date(event.start_datetime).toLocaleDateString(),
          created_at: event.start_datetime
        })));
      }

      // Search posts
      const { data: posts } = await supabase
        .from('posts')
        .select('id, content, author_id, created_at, profiles!posts_author_id_fkey(display_name, avatar_url)')
        .ilike('content', `%${query}%`)
        .eq('visibility', 'public')
        .limit(5);

      if (posts) {
        searchResults.push(...posts.map(post => ({
          id: post.id,
          type: 'post' as const,
          title: post.content.substring(0, 60) + (post.content.length > 60 ? '...' : ''),
          subtitle: `by ${post.profiles?.display_name}`,
          avatar_url: post.profiles?.avatar_url,
          created_at: post.created_at
        })));
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Error performing search:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleResultClick(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case 'user':
        navigate(`/profile/${result.id}`);
        break;
      case 'pet':
        navigate(`/pets#pet-${result.id}`);
        break;
      case 'group':
        navigate(`/groups#group-${result.id}`);
        break;
      case 'event':
        navigate(`/events#event-${result.id}`);
        break;
      case 'post':
        navigate(`/feed#post-${result.id}`);
        break;
    }
    onClose();
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'user': return User;
      case 'pet': return Heart;
      case 'group': return Users;
      case 'event': return Calendar;
      case 'post': return Camera;
      default: return Search;
    }
  };

  const getResultColor = (type: string) => {
    switch (type) {
      case 'user': return 'text-blue-600';
      case 'pet': return 'text-pink-600';
      case 'group': return 'text-purple-600';
      case 'event': return 'text-orange-600';
      case 'post': return 'text-green-600';
      default: return 'text-gray-600';
    }
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
            className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4"
          >
            {/* Search Input */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search users, pets, groups, events, and posts..."
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={onClose}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
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
                    const isSelected = index === selectedIndex;
                    
                    return (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleResultClick(result)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                      >
                        {result.avatar_url ? (
                          <img
                            src={result.avatar_url}
                            alt={result.title}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <ResultIcon className="h-5 w-5 text-gray-600" />
                          </div>
                        )}
                        
                        <div className="flex-1 text-left">
                          <h3 className="font-medium text-gray-900">{result.title}</h3>
                          <p className="text-sm text-gray-600">{result.subtitle}</p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs px-2 py-1 rounded-full bg-gray-100 ${getResultColor(result.type)}`}>
                            {result.type}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : searchTerm.length >= 2 ? (
                <div className="p-8 text-center">
                  <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                  <p className="text-gray-600">
                    Try different keywords or check your spelling
                  </p>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Start typing to search</h3>
                  <p className="text-gray-600">
                    Search for users, pets, groups, events, and posts
                  </p>
                </div>
              )}
            </div>

            {/* Search Tips */}
            {searchTerm.length === 0 && (
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-600 text-center">
                  Use ↑↓ arrows to navigate, Enter to select, Esc to close
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default GlobalSearch;