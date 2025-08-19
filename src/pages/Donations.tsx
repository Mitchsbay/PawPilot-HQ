import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase, uploadFile } from '../lib/supabase';
import { 
  Heart, Plus, Search, Filter, DollarSign, Target, 
  Calendar, MapPin, Users, Star, Gift, Upload,
  X, Check, Camera, Eye, EyeOff, Crown, Verified
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/UI/ConfirmDialog';

interface Cause {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  goal_amount: number;
  raised_amount: number;
  category: string;
  location?: string;
  organization_name: string;
  organization_verified: boolean;
  end_date?: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  creator_profile?: {
    display_name: string;
    avatar_url?: string;
  };
  recent_donations?: Array<{
    id: string;
    amount: number;
    donor_name?: string;
    message?: string;
    is_anonymous: boolean;
    created_at: string;
  }>;
}

interface Donation {
  id: string;
  cause_id: string;
  amount: number;
  donor_name?: string;
  message?: string;
  is_anonymous: boolean;
  created_at: string;
  causes: {
    title: string;
    organization_name: string;
  };
}

const Donations: React.FC = () => {
  const { profile } = useAuth();
  const [causes, setCauses] = useState<Cause[]>([]);
  const [myDonations, setMyDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'browse' | 'my-donations' | 'create'>('browse');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedCause, setSelectedCause] = useState<Cause | null>(null);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Donation form
  const [donationData, setDonationData] = useState({
    amount: '',
    customAmount: '',
    donor_name: '',
    message: '',
    is_anonymous: false
  });
  const [submittingDonation, setSubmittingDonation] = useState(false);

  // Create cause form
  const [causeData, setCauseData] = useState({
    title: '',
    description: '',
    goal_amount: '',
    category: 'animal_rescue',
    location: '',
    organization_name: '',
    end_date: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [submittingCause, setSubmittingCause] = useState(false);

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'animal_rescue', label: 'Animal Rescue' },
    { value: 'veterinary_care', label: 'Veterinary Care' },
    { value: 'shelter_support', label: 'Shelter Support' },
    { value: 'emergency_care', label: 'Emergency Care' },
    { value: 'spay_neuter', label: 'Spay/Neuter Programs' },
    { value: 'wildlife_conservation', label: 'Wildlife Conservation' },
    { value: 'therapy_animals', label: 'Therapy Animals' },
    { value: 'other', label: 'Other' }
  ];

  const quickAmounts = [10, 25, 50, 100, 250];

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [profile, categoryFilter]);

  const loadData = async () => {
    if (!profile) return;

    try {
      // Load active causes
      let causesQuery = supabase
        .from('causes')
        .select(`
          *,
          profiles!causes_created_by_fkey(display_name, avatar_url)
        `)
        .eq('is_active', true);

      if (categoryFilter !== 'all') {
        causesQuery = causesQuery.eq('category', categoryFilter);
      }

      const { data: causesData, error: causesError } = await causesQuery
        .order('created_at', { ascending: false });

      if (causesError) {
        console.error('Error loading causes:', causesError);
        toast.error('Failed to load causes');
      } else {
        // Load recent donations for each cause
        const causesWithDonations = await Promise.all(
          (causesData || []).map(async (cause) => {
            const { data: donationsData } = await supabase
              .from('donations')
              .select('id, amount, donor_name, message, is_anonymous, created_at')
              .eq('cause_id', cause.id)
              .order('created_at', { ascending: false })
              .limit(3);

            return {
              ...cause,
              creator_profile: cause.profiles,
              recent_donations: donationsData || []
            };
          })
        );

        setCauses(causesWithDonations);
      }

      // Load user's donations
      const { data: donationsData, error: donationsError } = await supabase
        .from('donations')
        .select(`
          *,
          causes!inner(title, organization_name)
        `)
        .eq('donor_id', profile.id)
        .order('created_at', { ascending: false });

      if (donationsError) {
        console.error('Error loading donations:', donationsError);
      } else {
        setMyDonations(donationsData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image must be less than 5MB');
        return;
      }
      
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCreateCause = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!causeData.title.trim() || !causeData.description.trim() || !causeData.goal_amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    const goalAmount = parseFloat(causeData.goal_amount);
    if (goalAmount <= 0) {
      toast.error('Goal amount must be greater than 0');
      return;
    }

    setSubmittingCause(true);

    try {
      let imageUrl = null;

      // Upload image if provided
      if (imageFile) {
        const filename = `cause_${Date.now()}.${imageFile.name.split('.').pop()}`;
        imageUrl = await uploadFile('causeImages', filename, imageFile);
        
        if (!imageUrl) {
          toast.error('Failed to upload image');
          setSubmittingCause(false);
          return;
        }
      }

      const newCause = {
        title: causeData.title.trim(),
        description: causeData.description.trim(),
        image_url: imageUrl,
        goal_amount: goalAmount,
        raised_amount: 0,
        category: causeData.category,
        location: causeData.location.trim() || null,
        organization_name: causeData.organization_name.trim(),
        organization_verified: false, // Requires admin verification
        end_date: causeData.end_date || null,
        created_by: profile.id,
        is_active: true
      };

      const { error } = await supabase
        .from('causes')
        .insert(newCause);

      if (error) {
        toast.error('Failed to create cause');
        console.error('Error creating cause:', error);
      } else {
        toast.success('Cause created successfully! It will be reviewed before going live.');
        setShowCreateModal(false);
        resetCreateForm();
        loadData();
      }
    } catch (error) {
      console.error('Error creating cause:', error);
      toast.error('Something went wrong');
    } finally {
      setSubmittingCause(false);
    }
  };

  const resetCreateForm = () => {
    setCauseData({
      title: '',
      description: '',
      goal_amount: '',
      category: 'animal_rescue',
      location: '',
      organization_name: '',
      end_date: ''
    });
    setImageFile(null);
    setImagePreview('');
  };

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedCause) return;

    const amount = donationData.amount === 'custom' 
      ? parseFloat(donationData.customAmount)
      : parseFloat(donationData.amount);

    if (!amount || amount <= 0) {
      toast.error('Please enter a valid donation amount');
      return;
    }

    setSubmittingDonation(true);

    try {
      // Create donation record
      const { error: donationError } = await supabase
        .from('donations')
        .insert({
          cause_id: selectedCause.id,
          donor_id: profile.id,
          amount,
          donor_name: donationData.is_anonymous ? null : (donationData.donor_name.trim() || profile.display_name),
          message: donationData.message.trim() || null,
          is_anonymous: donationData.is_anonymous
        });

      if (donationError) {
        toast.error('Failed to process donation');
        console.error('Error creating donation:', donationError);
        setSubmittingDonation(false);
        return;
      }

      // Update cause raised amount
      const { error: updateError } = await supabase
        .from('causes')
        .update({ 
          raised_amount: selectedCause.raised_amount + amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCause.id);

      if (updateError) {
        console.error('Error updating cause amount:', updateError);
      }

      toast.success(`Thank you for your $${amount} donation!`);
      setShowDonateModal(false);
      resetDonationForm();
      loadData();
    } catch (error) {
      console.error('Error processing donation:', error);
      toast.error('Something went wrong');
    } finally {
      setSubmittingDonation(false);
    }
  };

  const resetDonationForm = () => {
    setDonationData({
      amount: '',
      customAmount: '',
      donor_name: '',
      message: '',
      is_anonymous: false
    });
    setSelectedCause(null);
  };

  const openDonateModal = (cause: Cause) => {
    setSelectedCause(cause);
    setDonationData(prev => ({
      ...prev,
      donor_name: profile?.display_name || ''
    }));
    setShowDonateModal(true);
  };

  const getProgressPercentage = (raised: number, goal: number) => {
    return Math.min((raised / goal) * 100, 100);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const filteredCauses = causes.filter(cause =>
    cause.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cause.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cause.organization_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-80 bg-gray-200 rounded-lg"></div>
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
          <h1 className="text-3xl font-bold text-gray-900">Donations</h1>
          <p className="text-gray-600 mt-2">Support pet charities and causes that matter</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="mt-4 sm:mt-0 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create Cause</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-8">
        <button
          onClick={() => setActiveTab('browse')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'browse'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Browse Causes
        </button>
        <button
          onClick={() => setActiveTab('my-donations')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'my-donations'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          My Donations ({myDonations.length})
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'create'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Create Cause
        </button>
      </div>

      {/* Browse Causes Tab */}
      {activeTab === 'browse' && (
        <div>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>

            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search causes..."
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Causes Grid */}
          {filteredCauses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCauses.map((cause, index) => {
                const progressPercentage = getProgressPercentage(cause.raised_amount, cause.goal_amount);
                const isExpired = cause.end_date && new Date(cause.end_date) < new Date();
                
                return (
                  <motion.div
                    key={cause.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {/* Cause Image */}
                    <div className="relative h-48">
                      {cause.image_url ? (
                        <img
                          src={cause.image_url}
                          alt={cause.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                          <Heart className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                      
                      {/* Verification Badge */}
                      {cause.organization_verified && (
                        <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                          <Verified className="h-3 w-3" />
                          <span>Verified</span>
                        </div>
                      )}

                      {/* Expired Badge */}
                      {isExpired && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                          Expired
                        </div>
                      )}
                    </div>

                    {/* Cause Info */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{cause.title}</h3>
                        <span className="text-sm text-gray-500 capitalize">
                          {cause.category.replace('_', ' ')}
                        </span>
                      </div>

                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{cause.description}</p>

                      {/* Organization */}
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{cause.organization_name}</span>
                        </div>
                        {cause.location && (
                          <>
                            <span className="text-gray-300">•</span>
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-600">{cause.location}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Progress */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(cause.raised_amount)} raised
                          </span>
                          <span className="text-sm text-gray-600">
                            of {formatCurrency(cause.goal_amount)} goal
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {Math.round(progressPercentage)}% funded
                        </p>
                      </div>

                      {/* Recent Donations */}
                      {cause.recent_donations && cause.recent_donations.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs text-gray-500 mb-2">Recent supporters:</p>
                          <div className="space-y-1">
                            {cause.recent_donations.slice(0, 2).map((donation) => (
                              <div key={donation.id} className="text-xs text-gray-600">
                                <span className="font-medium">
                                  {donation.is_anonymous ? 'Anonymous' : donation.donor_name}
                                </span>
                                <span className="ml-1">donated {formatCurrency(donation.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Donate Button */}
                      <button
                        onClick={() => openDonateModal(cause)}
                        disabled={isExpired}
                        className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        {isExpired ? 'Campaign Ended' : 'Donate Now'}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                {searchTerm ? 'No causes match your search' : 'No causes available'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm 
                  ? 'Try adjusting your search terms or filters'
                  : 'Be the first to create a cause for your community'
                }
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
                >
                  <Plus className="h-5 w-5" />
                  <span>Create First Cause</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* My Donations Tab */}
      {activeTab === 'my-donations' && (
        <div>
          {myDonations.length > 0 ? (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Impact</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {formatCurrency(myDonations.reduce((sum, d) => sum + d.amount, 0))}
                    </div>
                    <p className="text-gray-600">Total Donated</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{myDonations.length}</div>
                    <p className="text-gray-600">Causes Supported</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {new Set(myDonations.map(d => d.causes.organization_name)).size}
                    </div>
                    <p className="text-gray-600">Organizations Helped</p>
                  </div>
                </div>
              </div>

              {myDonations.map((donation, index) => (
                <motion.div
                  key={donation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-lg shadow-md p-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{donation.causes.title}</h3>
                      <p className="text-gray-600">{donation.causes.organization_name}</p>
                      {donation.message && (
                        <p className="text-sm text-gray-700 mt-2 italic">"{donation.message}"</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(donation.amount)}
                      </div>
                      <p className="text-sm text-gray-500">
                        {new Date(donation.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Gift className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No donations yet</h3>
              <p className="text-gray-600 mb-6">
                Start making a difference by supporting pet causes
              </p>
              <button
                onClick={() => setActiveTab('browse')}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors inline-flex items-center space-x-2"
              >
                <Heart className="h-5 w-5" />
                <span>Browse Causes</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Cause Tab */}
      {activeTab === 'create' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Create New Cause</h2>
            
            <form onSubmit={handleCreateCause} className="space-y-6">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cause Image
                </label>
                <div className="flex items-center space-x-4">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Cause preview"
                      className="w-32 h-32 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                      <Camera className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <label className="cursor-pointer bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                      Choose Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-gray-500 mt-1">Max 5MB</p>
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cause Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={causeData.title}
                    onChange={(e) => setCauseData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter cause title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Goal Amount ($) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={causeData.goal_amount}
                    onChange={(e) => setCauseData(prev => ({ ...prev, goal_amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  value={causeData.description}
                  onChange={(e) => setCauseData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe your cause and how donations will be used..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={causeData.category}
                    onChange={(e) => setCauseData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.slice(1).map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={causeData.organization_name}
                    onChange={(e) => setCauseData(prev => ({ ...prev, organization_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Organization or individual name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={causeData.location}
                    onChange={(e) => setCauseData(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="City, State or Region"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date (optional)
                  </label>
                  <input
                    type="date"
                    value={causeData.end_date}
                    onChange={(e) => setCauseData(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <Star className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Review Process</p>
                    <p>All causes are reviewed by our team before going live to ensure legitimacy and compliance with our guidelines.</p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('browse')}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCause}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                >
                  {submittingCause ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Create Cause</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Donate Modal */}
      <AnimatePresence>
        {showDonateModal && selectedCause && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-full p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setShowDonateModal(false);
                  resetDonationForm();
                }}
                className="fixed inset-0 bg-black bg-opacity-50"
              />

              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
              >
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Make a Donation</h2>
                    <button
                      onClick={() => {
                        setShowDonateModal(false);
                        resetDonationForm();
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  <p className="text-gray-600 mt-2">{selectedCause.title}</p>
                </div>

                {/* Form */}
                <form onSubmit={handleDonate} className="p-6 space-y-4">
                  {/* Amount Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Donation Amount *
                    </label>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {quickAmounts.map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => setDonationData(prev => ({ ...prev, amount: amount.toString(), customAmount: '' }))}
                          className={`px-3 py-2 rounded-lg border transition-colors ${
                            donationData.amount === amount.toString()
                              ? 'border-green-600 bg-green-50 text-green-700'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          ${amount}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setDonationData(prev => ({ ...prev, amount: 'custom' }))}
                        className={`px-3 py-2 rounded-lg border transition-colors ${
                          donationData.amount === 'custom'
                            ? 'border-green-600 bg-green-50 text-green-700'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        Custom
                      </button>
                      {donationData.amount === 'custom' && (
                        <div className="flex-1">
                          <div className="relative">
                            <DollarSign className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                              type="number"
                              min="1"
                              step="0.01"
                              value={donationData.customAmount}
                              onChange={(e) => setDonationData(prev => ({ ...prev, customAmount: e.target.value }))}
                              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Donor Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={donationData.donor_name}
                      onChange={(e) => setDonationData(prev => ({ ...prev, donor_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="How should we display your name?"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message (optional)
                    </label>
                    <textarea
                      value={donationData.message}
                      onChange={(e) => setDonationData(prev => ({ ...prev, message: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Leave a message of support..."
                    />
                  </div>

                  {/* Anonymous Option */}
                  <div>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={donationData.is_anonymous}
                        onChange={(e) => setDonationData(prev => ({ ...prev, is_anonymous: e.target.checked }))}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">Donate anonymously</span>
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDonateModal(false);
                        resetDonationForm();
                      }}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingDonation}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                    >
                      {submittingDonation ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Heart className="h-4 w-4" />
                          <span>
                            Donate {donationData.amount === 'custom' 
                              ? `$${donationData.customAmount}` 
                              : `$${donationData.amount}`
                            }
                          </span>
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

      {/* Create Cause Modal */}
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
                className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
              >
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Create</h2>
                  <p className="text-gray-600 mb-6">
                    Use the "Create Cause" tab above for the full form, or click below to get started.
                  </p>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('create');
                        setShowCreateModal(false);
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Go to Form
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Donations;