import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase, LostFound, uploadFile } from '../lib/supabase';
import { 
  MapPin, Plus, Search, Filter, Phone, Mail, 
  AlertTriangle, CheckCircle, Clock, Camera,
  X, Check, Edit, Trash2, Heart, Share,
  Navigation, Eye, EyeOff, DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/UI/ConfirmDialog';
import InteractiveMap from '../components/Maps/InteractiveMap';


const LostFoundPage: React.FC = () => {
  const { profile } = useAuth();
  const [reports, setReports] = useState<LostFound[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'map' | 'list' | 'my-reports'>('map');
  const [statusFilter, setStatusFilter] = useState<'all' | 'lost' | 'found' | 'resolved'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<LostFound | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [deletingReport, setDeletingReport] = useState<LostFound | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Create report form
  const [reportData, setReportData] = useState({
    status: 'lost' as 'lost' | 'found',
    pet_name: '',
    species: 'dog' as 'dog' | 'cat' | 'bird' | 'rabbit' | 'hamster' | 'fish' | 'reptile' | 'other',
    breed: '',
    description: '',
    last_seen_location: '',
    latitude: 0,
    longitude: 0,
    contact_phone: '',
    contact_email: '',
    reward_offered: false,
    reward_amount: ''
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      loadReports();
      getUserLocation();
    }
  }, [profile, statusFilter]);

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
          // Default to a central location (e.g., San Francisco)
          setUserLocation({ lat: 37.7749, lng: -122.4194 });
        }
      );
    } else {
      // Default location if geolocation not supported
      setUserLocation({ lat: 37.7749, lng: -122.4194 });
    }
  };

  const loadReports = async () => {
    if (!profile) return;

    try {
      let query = supabase
        .from('lost_found')
        .select(`
          *,
          profiles!lost_found_reporter_id_fkey(display_name, avatar_url)
        `);

      // Filter by status if not 'all'
      if (statusFilter !== 'all') {
        if (statusFilter === 'resolved') {
          query = query.eq('is_resolved', true);
        } else {
          query = query.eq('status', statusFilter).eq('is_resolved', false);
        }
      }

      // For 'my-reports' tab, filter by user
      if (activeTab === 'my-reports') {
        query = query.eq('reporter_id', profile.id);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading reports:', error);
        toast.error('Failed to load reports');
      } else {
        setReports(data || []);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Photo must be less than 5MB');
        return;
      }
      
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setPhotoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!reportData.pet_name.trim() || !reportData.description.trim() || !reportData.last_seen_location.trim()) {
      toast.error('Pet name, description, and location are required');
      return;
    }

    if (!reportData.contact_email && !reportData.contact_phone) {
      toast.error('At least one contact method is required');
      return;
    }

    setSubmitting(true);

    try {
      let photoUrl = null;

      // Upload photo if provided
      if (photoFile) {
        const filename = `lostfound_${Date.now()}.${photoFile.name.split('.').pop()}`;
        photoUrl = await uploadFile('lostFoundPhotos', filename, photoFile);
        
        if (!photoUrl) {
          toast.error('Failed to upload photo');
          setSubmitting(false);
          return;
        }
      }

      // Use user's current location if coordinates not set
      const lat = reportData.latitude || userLocation?.lat || 37.7749;
      const lng = reportData.longitude || userLocation?.lng || -122.4194;

      const newReport = {
        reporter_id: profile.id,
        status: reportData.status,
        pet_name: reportData.pet_name.trim(),
        species: reportData.species,
        breed: reportData.breed.trim() || null,
        description: reportData.description.trim(),
        photo_url: photoUrl,
        last_seen_location: reportData.last_seen_location.trim(),
        latitude: lat,
        longitude: lng,
        contact_phone: reportData.contact_phone.trim() || null,
        contact_email: reportData.contact_email.trim() || null,
        reward_offered: reportData.reward_offered,
        reward_amount: reportData.reward_offered && reportData.reward_amount ? 
          parseFloat(reportData.reward_amount) : null,
        is_resolved: false
      };

      const { error } = await supabase
        .from('lost_found')
        .insert(newReport);

      if (error) {
        toast.error('Failed to create report');
        console.error('Error creating report:', error);
      } else {
        toast.success(`${reportData.status === 'lost' ? 'Lost' : 'Found'} pet report created successfully!`);
        setShowCreateModal(false);
        resetCreateForm();
        loadReports();
      }
    } catch (error) {
      console.error('Error creating report:', error);
      toast.error('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setReportData({
      status: 'lost',
      pet_name: '',
      species: 'dog',
      breed: '',
      description: '',
      last_seen_location: '',
      latitude: 0,
      longitude: 0,
      contact_phone: '',
      contact_email: '',
      reward_offered: false,
      reward_amount: ''
    });
    setPhotoFile(null);
    setPhotoPreview('');
  };

  const handleMarkResolved = async (report: LostFound) => {
    try {
      const { error } = await supabase
        .from('lost_found')
        .update({ 
          is_resolved: true,
          resolved_at: new Date().toISOString()
        })
        .eq('id', report.id);

      if (error) {
        toast.error('Failed to mark as resolved');
        console.error('Error marking as resolved:', error);
      } else {
        toast.success('Report marked as resolved!');
        loadReports();
      }
    } catch (error) {
      console.error('Error marking as resolved:', error);
      toast.error('Failed to mark as resolved');
    }
  };

  const handleDeleteReport = async () => {
    if (!deletingReport) return;

    try {
      const { error } = await supabase
        .from('lost_found')
        .delete()
        .eq('id', deletingReport.id);

      if (error) {
        toast.error('Failed to delete report');
        console.error('Error deleting report:', error);
      } else {
        toast.success('Report deleted successfully');
        loadReports();
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete report');
    } finally {
      setDeletingReport(null);
    }
  };

  const openReportModal = (report: LostFound) => {
    setSelectedReport(report);
    setShowReportModal(true);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string, isResolved: boolean) => {
    if (isResolved) return 'bg-green-100 text-green-800';
    switch (status) {
      case 'lost': return 'bg-red-100 text-red-800';
      case 'found': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string, isResolved: boolean) => {
    if (isResolved) return CheckCircle;
    switch (status) {
      case 'lost': return AlertTriangle;
      case 'found': return Heart;
      default: return Clock;
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = searchTerm === '' || 
      report.pet_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.breed?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.last_seen_location.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const mapMarkers = filteredReports.map(report => ({
    lat: report.latitude,
    lng: report.longitude,
    title: `${report.status.toUpperCase()}: ${report.pet_name}`,
    status: report.is_resolved ? 'resolved' : report.status
  }));

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
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
          <h1 className="text-3xl font-bold text-gray-900">Lost & Found</h1>
          <p className="text-gray-600 mt-2">Help reunite pets with their families</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="mt-4 sm:mt-0 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Report Pet</span>
        </button>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 space-y-4 lg:space-y-0">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('map')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'map'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Map View
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'list'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            List View
          </button>
          <button
            onClick={() => setActiveTab('my-reports')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'my-reports'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Reports
          </button>
        </div>

        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Reports</option>
            <option value="lost">Lost Pets</option>
            <option value="found">Found Pets</option>
            <option value="resolved">Resolved</option>
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search reports..."
              className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Map View */}
      {activeTab === 'map' && userLocation && (
        <div className="mb-8">
          <InteractiveMap
            center={userLocation}
            zoom={13}
            markers={filteredReports.map(report => ({
              id: report.id,
              latitude: report.latitude,
              longitude: report.longitude,
              title: `${report.status.toUpperCase()}: ${report.pet_name}`,
              description: report.description,
              type: report.is_resolved ? 'resolved' : report.status,
              onClick: () => openReportModal(report)
            }))}
            height="400px"
          />
          <p className="text-sm text-gray-600 mt-2 text-center">
            Showing {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''} in your area
          </p>
        </div>
      )}

      {/* Reports Grid/List */}
      {filteredReports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report, index) => {
            const StatusIcon = getStatusIcon(report.status, report.is_resolved);
            
            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Report Header */}
                <div className="relative">
                  {report.photo_url ? (
                    <img
                      src={report.photo_url}
                      alt={report.pet_name}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <Camera className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="absolute top-2 left-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      getStatusColor(report.status, report.is_resolved)
                    }`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {report.is_resolved ? 'Resolved' : report.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Reward Badge */}
                  {report.reward_offered && !report.is_resolved && (
                    <div className="absolute top-2 right-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <DollarSign className="h-3 w-3 mr-1" />
                        Reward
                      </span>
                    </div>
                  )}

                  {/* Actions for own reports */}
                  {report.reporter_id === profile?.id && (
                    <div className="absolute bottom-2 right-2 flex space-x-1">
                      {!report.is_resolved && (
                        <button
                          onClick={() => handleMarkResolved(report)}
                          className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                          title="Mark as resolved"
                        >
                          <CheckCircle className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={() => setDeletingReport(report)}
                        className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                        title="Delete report"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Report Content */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{report.pet_name}</h3>
                    <span className="text-sm text-gray-500">{formatTimeAgo(report.created_at)}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                    <span className="capitalize">{report.species}</span>
                    {report.breed && (
                      <>
                        <span>•</span>
                        <span>{report.breed}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center space-x-1 text-sm text-gray-600 mb-3">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{report.last_seen_location}</span>
                  </div>

                  <p className="text-gray-700 text-sm mb-4 line-clamp-2">{report.description}</p>

                  {report.reward_offered && report.reward_amount && (
                    <div className="flex items-center space-x-1 text-sm text-yellow-700 mb-3">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-medium">${report.reward_amount} reward offered</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openReportModal(report)}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      View Details
                    </button>
                    
                    {(report.contact_phone || report.contact_email) && report.reporter_id !== profile?.id && (
                      <button
                        onClick={() => openReportModal(report)}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        Contact
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <AlertTriangle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            {activeTab === 'my-reports' ? 'No reports created yet' : 
             searchTerm ? 'No reports match your search' : 'No reports found'}
          </h3>
          <p className="text-gray-600 mb-6">
            {activeTab === 'my-reports' 
              ? 'Create your first report to help find lost pets or report found ones'
              : searchTerm 
                ? 'Try adjusting your search terms or filters'
                : 'Be the first to report a lost or found pet in your area'
            }
          </p>
          {(activeTab === 'my-reports' || !searchTerm) && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors inline-flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Report Pet</span>
            </button>
          )}
        </div>
      )}

      {/* Create Report Modal */}
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
                  <h2 className="text-xl font-semibold text-gray-900">Report Lost/Found Pet</h2>
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
                <form onSubmit={handleCreateReport} className="p-6 space-y-4">
                  {/* Status Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Report Type *
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="lost"
                          checked={reportData.status === 'lost'}
                          onChange={(e) => setReportData(prev => ({ ...prev, status: e.target.value as 'lost' | 'found' }))}
                          className="mr-2"
                        />
                        <span className="text-red-600 font-medium">Lost Pet</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="found"
                          checked={reportData.status === 'found'}
                          onChange={(e) => setReportData(prev => ({ ...prev, status: e.target.value as 'lost' | 'found' }))}
                          className="mr-2"
                        />
                        <span className="text-blue-600 font-medium">Found Pet</span>
                      </label>
                    </div>
                  </div>

                  {/* Photo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pet Photo
                    </label>
                    <div className="flex items-center space-x-4">
                      {photoPreview ? (
                        <img
                          src={photoPreview}
                          alt="Pet preview"
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                          <Camera className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <label className="cursor-pointer bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                          Choose Photo
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                        </label>
                        <p className="text-xs text-gray-500 mt-1">Max 5MB</p>
                      </div>
                    </div>
                  </div>

                  {/* Pet Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pet Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={reportData.pet_name}
                        onChange={(e) => setReportData(prev => ({ ...prev, pet_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter pet name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Species *
                      </label>
                      <select
                        required
                        value={reportData.species}
                        onChange={(e) => setReportData(prev => ({ ...prev, species: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="dog">Dog</option>
                        <option value="cat">Cat</option>
                        <option value="bird">Bird</option>
                        <option value="rabbit">Rabbit</option>
                        <option value="hamster">Hamster</option>
                        <option value="fish">Fish</option>
                        <option value="reptile">Reptile</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Breed
                    </label>
                    <input
                      type="text"
                      value={reportData.breed}
                      onChange={(e) => setReportData(prev => ({ ...prev, breed: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter breed (optional)"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description *
                    </label>
                    <textarea
                      required
                      value={reportData.description}
                      onChange={(e) => setReportData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe the pet's appearance, behavior, and any distinguishing features..."
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {reportData.status === 'lost' ? 'Last Seen Location' : 'Found Location'} *
                    </label>
                    <div className="space-y-3">
                      <input
                        type="text"
                        required
                        value={reportData.last_seen_location}
                        onChange={(e) => setReportData(prev => ({ ...prev, last_seen_location: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter specific location (street, park, neighborhood)"
                      />
                      
                      {userLocation && (
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Or click on the map to select location:</p>
                          <InteractiveMap
                            center={selectedLocation || userLocation}
                            zoom={15}
                            onLocationSelect={(lat, lng) => {
                              setSelectedLocation({ lat, lng });
                              setReportData(prev => ({ 
                                ...prev, 
                                latitude: lat, 
                                longitude: lng 
                              }));
                            }}
                            height="200px"
                          />
                          {selectedLocation && (
                            <p className="text-xs text-gray-500 mt-1">
                              Selected: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Information * (at least one required)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Phone Number</label>
                        <input
                          type="tel"
                          value={reportData.contact_phone}
                          onChange={(e) => setReportData(prev => ({ ...prev, contact_phone: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Your phone number"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Email Address</label>
                        <input
                          type="email"
                          value={reportData.contact_email}
                          onChange={(e) => setReportData(prev => ({ ...prev, contact_email: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Your email address"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Reward Information */}
                  {reportData.status === 'lost' && (
                    <div>
                      <label className="flex items-center space-x-3 mb-2">
                        <input
                          type="checkbox"
                          checked={reportData.reward_offered}
                          onChange={(e) => setReportData(prev => ({ ...prev, reward_offered: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium text-gray-900">Reward Offered</span>
                      </label>
                      {reportData.reward_offered && (
                        <div className="ml-6">
                          <label className="block text-xs text-gray-600 mb-1">Reward Amount ($)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={reportData.reward_amount}
                            onChange={(e) => setReportData(prev => ({ ...prev, reward_amount: e.target.value }))}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.00"
                          />
                        </div>
                      )}
                    </div>
                  )}

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
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Create Report</span>
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

      {/* Report Details Modal */}
      <AnimatePresence>
        {showReportModal && selectedReport && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-full p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowReportModal(false)}
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
                <div className="relative">
                  {selectedReport.photo_url ? (
                    <img
                      src={selectedReport.photo_url}
                      alt={selectedReport.pet_name}
                      className="w-full h-64 object-cover"
                    />
                  ) : (
                    <div className="w-full h-64 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <Camera className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                  
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  {/* Status Badge */}
                  <div className="absolute top-4 left-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      getStatusColor(selectedReport.status, selectedReport.is_resolved)
                    }`}>
                      {selectedReport.is_resolved ? 'RESOLVED' : selectedReport.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  {/* Pet Info */}
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedReport.pet_name}</h2>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="capitalize">{selectedReport.species}</span>
                      {selectedReport.breed && (
                        <>
                          <span>•</span>
                          <span>{selectedReport.breed}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>Reported {formatTimeAgo(selectedReport.created_at)}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-700">{selectedReport.description}</p>
                  </div>

                  {/* Location */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {selectedReport.status === 'lost' ? 'Last Seen Location' : 'Found Location'}
                    </h3>
                    <div className="flex items-center space-x-2 text-gray-700">
                      <MapPin className="h-4 w-4" />
                      <span>{selectedReport.last_seen_location}</span>
                    </div>
                  </div>

                  {/* Reward Info */}
                  {selectedReport.reward_offered && selectedReport.reward_amount && (
                    <div className="mb-6">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-5 w-5 text-yellow-600" />
                          <span className="font-semibold text-yellow-800">
                            ${selectedReport.reward_amount} Reward Offered
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Contact Information */}
                  {(selectedReport.contact_phone || selectedReport.contact_email) && 
                   selectedReport.reporter_id !== profile?.id && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
                      <div className="space-y-2">
                        {selectedReport.contact_phone && (
                          <a
                            href={`tel:${selectedReport.contact_phone}`}
                            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
                          >
                            <Phone className="h-4 w-4" />
                            <span>{selectedReport.contact_phone}</span>
                          </a>
                        )}
                        {selectedReport.contact_email && (
                          <a
                            href={`mailto:${selectedReport.contact_email}`}
                            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
                          >
                            <Mail className="h-4 w-4" />
                            <span>{selectedReport.contact_email}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Map */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Location</h3>
                    <InteractiveMap
                      center={{ lat: selectedReport.latitude, lng: selectedReport.longitude }}
                      zoom={15}
                      markers={[{
                        id: selectedReport.id,
                        latitude: selectedReport.latitude,
                        longitude: selectedReport.longitude,
                        title: selectedReport.pet_name,
                        description: selectedReport.description,
                        type: selectedReport.is_resolved ? 'resolved' : selectedReport.status
                      }]}
                      height="300px"
                    />
                  </div>

                  {/* Actions */}
                  {selectedReport.reporter_id === profile?.id && !selectedReport.is_resolved && (
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          handleMarkResolved(selectedReport);
                          setShowReportModal(false);
                        }}
                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        Mark as Resolved
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Report Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingReport}
        onClose={() => setDeletingReport(null)}
        onConfirm={handleDeleteReport}
        title="Delete Report"
        message={`Are you sure you want to delete the report for "${deletingReport?.pet_name}"? This action cannot be undone.`}
        confirmText="Delete Report"
        type="danger"
      />
    </div>
  );
};

export default LostFoundPage;