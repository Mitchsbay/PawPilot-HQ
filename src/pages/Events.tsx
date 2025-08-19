import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { 
  Calendar, Plus, MapPin, Clock, Users, Star, 
  Filter, Search, X, Check, Edit, Trash2,
  ChevronLeft, ChevronRight, User, Crown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/UI/ConfirmDialog';
import EventCalendar from '../components/Calendar/EventCalendar';
import EventMap from '../components/Events/EventMap';

interface Event {
  id: string;
  title: string;
  description?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  start_datetime: string;
  end_datetime?: string;
  created_by: string;
  group_id?: string;
  max_attendees?: number;
  is_private: boolean;
  rsvp_count: number;
  created_at: string;
  updated_at: string;
  creator_profile?: {
    display_name: string;
    avatar_url?: string;
  };
  group?: {
    name: string;
    avatar_url?: string;
  };
  user_rsvp?: {
    status: string;
  };
  user_is_creator?: boolean;
}

interface EventRSVP {
  id: string;
  event_id: string;
  user_id: string;
  status: string;
  created_at: string;
  profiles: {
    display_name: string;
    avatar_url?: string;
  };
}

const Events: React.FC = () => {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'my-events' | 'past'>('upcoming');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventRSVPs, setEventRSVPs] = useState<EventRSVP[]>([]);
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Create event form
  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    location: '',
    start_datetime: '',
    end_datetime: '',
    max_attendees: '',
    is_private: false,
    group_id: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (profile) {
      loadEvents();
      loadUserGroups();
      getUserLocation();
    }
  }, [profile, activeTab]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Location access denied:', error);
          // Default to a central location
          setUserLocation({ lat: 37.7749, lng: -122.4194 });
        }
      );
    } else {
      setUserLocation({ lat: 37.7749, lng: -122.4194 });
    }
  };

  const loadEvents = async () => {
    if (!profile) return;

    try {
      const now = new Date().toISOString();
      let query = supabase
        .from('events')
        .select(`
          *,
          profiles!events_created_by_fkey(display_name, avatar_url),
          groups(name, avatar_url)
        `);

      // Filter based on active tab
      if (activeTab === 'upcoming') {
        query = query.gte('start_datetime', now);
      } else if (activeTab === 'past') {
        query = query.lt('start_datetime', now);
      } else if (activeTab === 'my-events') {
        query = query.eq('created_by', profile.id);
      }

      // Only show public events or events user is invited to
      if (activeTab !== 'my-events') {
        query = query.eq('is_private', false);
      }

      const { data: eventsData, error: eventsError } = await query
        .order('start_datetime', { ascending: activeTab !== 'past' });

      if (eventsError) {
        console.error('Error loading events:', eventsError);
        toast.error('Failed to load events');
      } else {
        // Check RSVP status for each event
        const eventsWithRSVP = await Promise.all(
          (eventsData || []).map(async (event) => {
            const { data: rsvpData } = await supabase
              .from('event_rsvps')
              .select('status')
              .eq('event_id', event.id)
              .eq('user_id', profile.id)
              .single();

            return {
              ...event,
              creator_profile: event.profiles,
              user_rsvp: rsvpData,
              user_is_creator: event.created_by === profile.id
            };
          })
        );

        setEvents(eventsWithRSVP);
      }
    } catch (error) {
      console.error('Error loading events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const loadUserGroups = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          groups!inner(id, name)
        `)
        .eq('user_id', profile.id);

      if (error) {
        console.error('Error loading user groups:', error);
      } else {
        setGroups(data?.map(item => item.groups) || []);
      }
    } catch (error) {
      console.error('Error loading user groups:', error);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!eventData.title.trim() || !eventData.start_datetime) {
      toast.error('Title and start date/time are required');
      return;
    }

    // Validate end datetime if provided
    if (eventData.end_datetime && eventData.end_datetime <= eventData.start_datetime) {
      toast.error('End date/time must be after start date/time');
      return;
    }

    setSubmitting(true);

    try {
      const newEvent = {
        title: eventData.title.trim(),
        description: eventData.description.trim() || null,
        location: eventData.location.trim() || null,
        start_datetime: eventData.start_datetime,
        end_datetime: eventData.end_datetime || null,
        created_by: profile.id,
        group_id: eventData.group_id || null,
        max_attendees: eventData.max_attendees ? parseInt(eventData.max_attendees) : null,
        is_private: eventData.is_private,
        rsvp_count: 0
      };

      const { error } = await supabase
        .from('events')
        .insert(newEvent);

      if (error) {
        toast.error('Failed to create event');
        console.error('Error creating event:', error);
      } else {
        toast.success('Event created successfully!');
        setShowCreateModal(false);
        resetCreateForm();
        loadEvents();
      }
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setEventData({
      title: '',
      description: '',
      location: '',
      start_datetime: '',
      end_datetime: '',
      max_attendees: '',
      is_private: false,
      group_id: ''
    });
  };

  const handleRSVP = async (event: Event, status: 'going' | 'maybe' | 'not_going') => {
    if (!profile) return;

    try {
      if (event.user_rsvp) {
        // Update existing RSVP
        const { error } = await supabase
          .from('event_rsvps')
          .update({ status })
          .eq('event_id', event.id)
          .eq('user_id', profile.id);

        if (error) {
          toast.error('Failed to update RSVP');
          console.error('Error updating RSVP:', error);
          return;
        }
      } else {
        // Create new RSVP
        const { error } = await supabase
          .from('event_rsvps')
          .insert({
            event_id: event.id,
            user_id: profile.id,
            status
          });

        if (error) {
          toast.error('Failed to RSVP');
          console.error('Error creating RSVP:', error);
          return;
        }

        // Update event RSVP count
        await supabase
          .from('events')
          .update({ rsvp_count: event.rsvp_count + 1 })
          .eq('id', event.id);
      }

      toast.success(`RSVP updated to "${status.replace('_', ' ')}"`);
      loadEvents();
    } catch (error) {
      console.error('Error handling RSVP:', error);
      toast.error('Failed to update RSVP');
    }
  };

  const loadEventRSVPs = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('event_rsvps')
        .select(`
          *,
          profiles!event_rsvps_user_id_fkey(display_name, avatar_url)
        `)
        .eq('event_id', eventId)
        .eq('status', 'going')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading event RSVPs:', error);
      } else {
        setEventRSVPs(data || []);
      }
    } catch (error) {
      console.error('Error loading event RSVPs:', error);
    }
  };

  const openEventModal = (event: Event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
    loadEventRSVPs(event.id);
  };

  const handleDeleteEvent = async () => {
    if (!deletingEvent) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', deletingEvent.id);

      if (error) {
        toast.error('Failed to delete event');
        console.error('Error deleting event:', error);
      } else {
        toast.success('Event deleted successfully');
        loadEvents();
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    } finally {
      setDeletingEvent(null);
    }
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Tomorrow';
    if (diffInDays === -1) return 'Yesterday';
    if (diffInDays > 1 && diffInDays <= 7) return `In ${diffInDays} days`;
    if (diffInDays < -1 && diffInDays >= -7) return `${Math.abs(diffInDays)} days ago`;
    
    return date.toLocaleDateString([], { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatEventTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isEventFull = (event: Event) => {
    return event.max_attendees && event.rsvp_count >= event.max_attendees;
  };

  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-600 mt-2">Discover and organize pet community events</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="mt-4 sm:mt-0 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create Event</span>
        </button>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'upcoming'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'calendar'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'map'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Map
          </button>
          <button
            onClick={() => setActiveTab('my-events')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'my-events'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Events
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'past'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Past
          </button>
        </div>

        <div className="mt-4 sm:mt-0 relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search events..."
            className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Calendar View */}
      {activeTab === 'calendar' && (
        <EventCalendar />
      )}
      
      {/* Map View */}
      {activeTab === 'map' && (
        <div className="mb-8">
          {userLocation ? (
            <EventMap
              events={filteredEvents.filter(e => e.latitude && e.longitude)}
              center={userLocation}
              onEventSelect={openEventModal}
              height="500px"
            />
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Location access needed</h3>
              <p className="text-gray-600 mb-4">
                Enable location access to see events on the map
              </p>
              <button
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        setUserLocation({
                          lat: position.coords.latitude,
                          lng: position.coords.longitude
                        });
                      },
                      (error) => {
                        console.error('Geolocation error:', error);
                        toast.error('Unable to get your location');
                      }
                    );
                  }
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Enable Location
              </button>
            </div>
          )}
        </div>
      )}

      {/* Events Grid */}
      {activeTab !== 'calendar' && filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Event Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-600">
                      {formatEventDate(event.start_datetime)}
                    </span>
                  </div>
                  {event.user_is_creator && (
                    <Crown className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{event.title}</h3>
                
                <div className="flex items-center text-sm text-gray-600 space-x-4">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatEventTime(event.start_datetime)}</span>
                  </div>
                  {event.location && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Event Content */}
              <div className="p-4">
                {event.description && (
                  <p className="text-gray-700 text-sm mb-4 line-clamp-3">{event.description}</p>
                )}

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>
                      {event.rsvp_count} going
                      {event.max_attendees && ` / ${event.max_attendees} max`}
                    </span>
                  </div>
                  
                  {event.group && (
                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                      <span>by {event.group.name}</span>
                    </div>
                  )}
                </div>

                {/* RSVP Status */}
                {event.user_rsvp && (
                  <div className="mb-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      event.user_rsvp.status === 'going' 
                        ? 'bg-green-100 text-green-800'
                        : event.user_rsvp.status === 'maybe'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {event.user_rsvp.status === 'going' && '✓ Going'}
                      {event.user_rsvp.status === 'maybe' && '? Maybe'}
                      {event.user_rsvp.status === 'not_going' && '✗ Not Going'}
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => openEventModal(event)}
                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    View Details
                  </button>
                  
                  {!event.user_is_creator && activeTab === 'upcoming' && (
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleRSVP(event, 'going')}
                        disabled={isEventFull(event) && !event.user_rsvp}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          event.user_rsvp?.status === 'going'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        Going
                      </button>
                      <button
                        onClick={() => handleRSVP(event, 'maybe')}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          event.user_rsvp?.status === 'maybe'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Maybe
                      </button>
                    </div>
                  )}

                  {event.user_is_creator && (
                    <button
                      onClick={() => setDeletingEvent(event)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : activeTab !== 'calendar' && (
        <div className="text-center py-12">
          <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            {activeTab === 'my-events' ? 'No events created yet' : 
             activeTab === 'past' ? 'No past events' : 'No upcoming events'}
          </h3>
          <p className="text-gray-600 mb-6">
            {activeTab === 'my-events' 
              ? 'Create your first event to bring the pet community together'
              : searchTerm 
                ? 'Try adjusting your search terms'
                : 'Be the first to organize a pet event in your area'
            }
          </p>
          {(activeTab === 'my-events' || !searchTerm) && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Create Event</span>
            </button>
          )}
        </div>
      )}

      {/* Create Event Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-full p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
                className="fixed inset-0 bg-black bg-opacity-50"
              />

              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Create Event</h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetCreateForm();
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
                  {/* Event Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={eventData.title}
                      onChange={(e) => setEventData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter event title"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={eventData.description}
                      onChange={(e) => setEventData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="What's this event about?"
                    />
                  </div>

                  {/* Date and Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={eventData.start_datetime}
                        onChange={(e) => setEventData(prev => ({ ...prev, start_datetime: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={eventData.end_datetime}
                        onChange={(e) => setEventData(prev => ({ ...prev, end_datetime: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={eventData.location}
                      onChange={(e) => setEventData(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Where will this event take place?"
                    />
                  </div>

                  {/* Max Attendees and Group */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Attendees
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={eventData.max_attendees}
                        onChange={(e) => setEventData(prev => ({ ...prev, max_attendees: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="No limit"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Associated Group
                      </label>
                      <select
                        value={eventData.group_id}
                        onChange={(e) => setEventData(prev => ({ ...prev, group_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">No group</option>
                        {groups.map(group => (
                          <option key={group.id} value={group.id}>{group.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Privacy Setting */}
                  <div>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={eventData.is_private}
                        onChange={(e) => setEventData(prev => ({ ...prev, is_private: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-medium text-gray-900">Private Event</span>
                        <p className="text-sm text-gray-600">Only invited users can see and join this event</p>
                      </div>
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        resetCreateForm();
                      }}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Create Event</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Event Details Modal */}
      <AnimatePresence>
        {showEventModal && selectedEvent && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-full p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowEventModal(false)}
                className="fixed inset-0 bg-black bg-opacity-50"
              />

              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
              >
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedEvent.title}</h2>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatEventDate(selectedEvent.start_datetime)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatEventTime(selectedEvent.start_datetime)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowEventModal(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {/* Event Details */}
                  {selectedEvent.description && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                      <p className="text-gray-700">{selectedEvent.description}</p>
                    </div>
                  )}

                  {selectedEvent.location && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-gray-900 mb-2">Location</h3>
                      <div className="flex items-center space-x-2 text-gray-700">
                        <MapPin className="h-4 w-4" />
                        <span>{selectedEvent.location}</span>
                      </div>
                    </div>
                  )}

                  {/* Event Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Users className="h-5 w-5 text-blue-600" />
                        <span className="font-medium text-gray-900">Attendees</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {selectedEvent.rsvp_count}
                        {selectedEvent.max_attendees && (
                          <span className="text-sm font-normal text-gray-600">
                            / {selectedEvent.max_attendees}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-gray-900">Created</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(selectedEvent.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* RSVP Actions */}
                  {!selectedEvent.user_is_creator && activeTab === 'upcoming' && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-gray-900 mb-3">RSVP</h3>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleRSVP(selectedEvent, 'going')}
                          disabled={isEventFull(selectedEvent) && !selectedEvent.user_rsvp}
                          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                            selectedEvent.user_rsvp?.status === 'going'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          Going
                        </button>
                        <button
                          onClick={() => handleRSVP(selectedEvent, 'maybe')}
                          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                            selectedEvent.user_rsvp?.status === 'maybe'
                              ? 'bg-yellow-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Maybe
                        </button>
                        <button
                          onClick={() => handleRSVP(selectedEvent, 'not_going')}
                          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                            selectedEvent.user_rsvp?.status === 'not_going'
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Can't Go
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Attendees List */}
                  {eventRSVPs.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">
                        Going ({eventRSVPs.length})
                      </h3>
                      <div className="space-y-3 max-h-40 overflow-y-auto">
                        {eventRSVPs.map((rsvp) => (
                          <div key={rsvp.id} className="flex items-center space-x-3">
                            {rsvp.profiles.avatar_url ? (
                              <img
                                src={rsvp.profiles.avatar_url}
                                alt={rsvp.profiles.display_name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-gray-600" />
                              </div>
                            )}
                            <span className="font-medium text-gray-900">
                              {rsvp.profiles.display_name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Event Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingEvent}
        onClose={() => setDeletingEvent(null)}
        onConfirm={handleDeleteEvent}
        title="Delete Event"
        message={`Are you sure you want to delete "${deletingEvent?.title}"? This action cannot be undone and will remove all RSVPs.`}
        confirmText="Delete Event"
        type="danger"
      />
    </div>
  );
};

export default Events;