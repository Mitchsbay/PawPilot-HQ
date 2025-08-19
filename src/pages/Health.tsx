import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase, Pet, HealthRecord, uploadFile } from '../lib/supabase';
import { 
  Heart, Plus, Edit, Trash2, Calendar, DollarSign, FileText, 
  Upload, X, Check, Activity, Stethoscope, Pill, Scissors, 
  AlertTriangle, Thermometer, Filter, Search, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/UI/ConfirmDialog';
import SymptomAnalyzer from '../components/Health/SymptomAnalyzer';
import VaccinationReminders from '../components/Health/VaccinationReminders';
import HealthInsights from '../components/Health/HealthInsights';
import AppointmentReminders from '../components/Health/AppointmentReminders';
import MedicationTracker from '../components/Health/MedicationTracker';

const Health: React.FC = () => {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pets, setPets] = useState<Pet[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<HealthRecord | null>(null);
  const [selectedPet, setSelectedPet] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeHealthTab, setActiveHealthTab] = useState<'records' | 'reminders' | 'analyzer'>('records');

  // Form state
  const [formData, setFormData] = useState({
    pet_id: '',
    type: 'checkup' as HealthRecord['type'],
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    veterinarian: '',
    cost: ''
  });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const recordTypes = [
    { value: 'checkup', label: 'Checkup', icon: Stethoscope, color: 'bg-blue-500' },
    { value: 'vaccination', label: 'Vaccination', icon: Activity, color: 'bg-green-500' },
    { value: 'medication', label: 'Medication', icon: Pill, color: 'bg-purple-500' },
    { value: 'surgery', label: 'Surgery', icon: Scissors, color: 'bg-red-500' },
    { value: 'emergency', label: 'Emergency', icon: AlertTriangle, color: 'bg-orange-500' },
    { value: 'symptom', label: 'Symptom', icon: Thermometer, color: 'bg-yellow-500' },
    { value: 'other', label: 'Other', icon: FileText, color: 'bg-gray-500' }
  ];

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [profile]);

  useEffect(() => {
    const action = searchParams.get('action');
    const petId = searchParams.get('pet');
    
    if (action === 'add') {
      setShowAddModal(true);
      if (petId) {
        setFormData(prev => ({ ...prev, pet_id: petId }));
      }
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const loadData = async () => {
    if (!profile) return;

    try {
      // Load user's pets
      const { data: petsData, error: petsError } = await supabase
        .from('pets')
        .select('*')
        .eq('owner_id', profile.id)
        .order('name');

      if (petsError) {
        console.error('Error loading pets:', petsError);
        toast.error('Failed to load pets');
      } else {
        setPets(petsData || []);
      }

      // Load health records
      const { data: recordsData, error: recordsError } = await supabase
        .from('health_records')
        .select(`
          *,
          pets!inner(id, name, species, owner_id)
        `)
        .eq('pets.owner_id', profile.id)
        .order('date', { ascending: false });

      if (recordsError) {
        console.error('Error loading health records:', recordsError);
        toast.error('Failed to load health records');
      } else {
        setHealthRecords(recordsData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      pet_id: '',
      type: 'checkup',
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      veterinarian: '',
      cost: ''
    });
    setAttachmentFile(null);
    setEditingRecord(null);
  };

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File must be less than 10MB');
        return;
      }
      setAttachmentFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!formData.pet_id || !formData.title.trim()) {
      toast.error('Pet and title are required');
      return;
    }

    setSubmitting(true);

    try {
      let attachmentUrl = editingRecord?.attachment_url || null;

      // Upload attachment if provided
      if (attachmentFile) {
        const filename = `health_${Date.now()}.${attachmentFile.name.split('.').pop()}`;
        attachmentUrl = await uploadFile('healthAttachments', filename, attachmentFile);
        
        if (!attachmentUrl) {
          toast.error('Failed to upload attachment');
          setSubmitting(false);
          return;
        }
      }

      const recordData = {
        pet_id: formData.pet_id,
        type: formData.type,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        date: formData.date,
        veterinarian: formData.veterinarian.trim() || null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        attachment_url: attachmentUrl
      };

      if (editingRecord) {
        // Update existing record
        const { error } = await supabase
          .from('health_records')
          .update(recordData)
          .eq('id', editingRecord.id);

        if (error) {
          toast.error('Failed to update health record');
          console.error('Error updating health record:', error);
        } else {
          toast.success('Health record updated successfully!');
          setShowAddModal(false);
          resetForm();
          loadData();
        }
      } else {
        // Create new record
        const { error } = await supabase
          .from('health_records')
          .insert(recordData);

        if (error) {
          toast.error('Failed to add health record');
          console.error('Error adding health record:', error);
        } else {
          toast.success('Health record added successfully!');
          setShowAddModal(false);
          resetForm();
          loadData();
        }
      }
    } catch (error) {
      console.error('Error submitting health record:', error);
      toast.error('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (record: HealthRecord) => {
    setEditingRecord(record);
    setFormData({
      pet_id: record.pet_id,
      type: record.type,
      title: record.title,
      description: record.description || '',
      date: record.date,
      veterinarian: record.veterinarian || '',
      cost: record.cost?.toString() || ''
    });
    setShowAddModal(true);
  };

  const handleDelete = async () => {
    if (!deletingRecord) return;

    try {
      const { error } = await supabase
        .from('health_records')
        .delete()
        .eq('id', deletingRecord.id);

      if (error) {
        toast.error('Failed to delete health record');
        console.error('Error deleting health record:', error);
      } else {
        toast.success('Health record deleted successfully');
        loadData();
      }
    } catch (error) {
      console.error('Error deleting health record:', error);
      toast.error('Failed to delete health record');
    } finally {
      setDeletingRecord(null);
    }
  };

  const getRecordTypeInfo = (type: HealthRecord['type']) => {
    return recordTypes.find(rt => rt.value === type) || recordTypes[0];
  };

  const filteredRecords = healthRecords.filter(record => {
    const matchesPet = !selectedPet || record.pet_id === selectedPet;
    const matchesType = !filterType || record.type === filterType;
    const matchesSearch = !searchTerm || 
      record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.veterinarian?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesPet && matchesType && matchesSearch;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <button
            onClick={() => setActiveHealthTab('insights')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeHealthTab === 'insights'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Health Insights
          </button>
          <button
            onClick={() => setActiveHealthTab('appointments')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeHealthTab === 'appointments'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Appointments
          </button>
          <button
            onClick={() => setActiveHealthTab('medications')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeHealthTab === 'medications'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Medications
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Health Tracking</h1>
          <p className="text-gray-600 mt-2">Monitor your pets' health records and appointments</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="mt-4 sm:mt-0 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Record</span>
        </button>
      </div>

      {pets.length === 0 ? (
        <div className="text-center py-12">
          <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No pets found</h3>
          <p className="text-gray-600 mb-6">
            You need to add pets before you can track their health records
          </p>
          <Link
            to="/pets"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Add Your First Pet</span>
          </Link>
        </div>
      ) : (
        <>
          {/* Health Tabs */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-8">
            <button
              onClick={() => setActiveHealthTab('records')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeHealthTab === 'records'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Health Records
            </button>
            <button
              onClick={() => setActiveHealthTab('reminders')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeHealthTab === 'reminders'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Vaccination Reminders
            </button>
            <button
              onClick={() => setActiveHealthTab('analyzer')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeHealthTab === 'analyzer'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Symptom Analyzer
            </button>
          </div>

          {/* Tab Content */}
          {activeHealthTab === 'reminders' && <VaccinationReminders />}
          
          {activeHealthTab === 'analyzer' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">AI Symptom Analyzer</h2>
                <p className="text-gray-600 mb-6">
                  Get preliminary insights about your pet's symptoms using AI analysis. 
                  This tool helps you understand when to seek veterinary care.
                </p>
                
                {pets.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pets.map((pet) => (
                      <div key={pet.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-3">
                          {pet.photo_url ? (
                            <img
                              src={pet.photo_url}
                              alt={pet.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                              <Heart className="h-6 w-6 text-gray-600" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-medium text-gray-900">{pet.name}</h3>
                            <p className="text-sm text-gray-600 capitalize">{pet.species}</p>
                          </div>
                        </div>
                        <SymptomAnalyzer
                          petId={pet.id}
                          petName={pet.name}
                          petSpecies={pet.species}
                          onAnalysisComplete={loadData}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">Add pets to use the symptom analyzer</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeHealthTab === 'records' && (
            <>
              {/* Filters */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filter by Pet
                    </label>
                    <select
                      value={selectedPet}
                      onChange={(e) => setSelectedPet(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Pets</option>
                      {pets.map(pet => (
                        <option key={pet.id} value={pet.id}>{pet.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filter by Type
                    </label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Types</option>
                      {recordTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Records
                    </label>
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search records..."
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Health Records */}
              {filteredRecords.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredRecords.map((record, index) => {
                    const typeInfo = getRecordTypeInfo(record.type);
                    const pet = pets.find(p => p.id === record.pet_id);
                    
                    return (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        {/* Header */}
                        <div className="p-4 border-b border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                                <typeInfo.icon className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">{record.title}</h3>
                                <p className="text-sm text-gray-600">{pet?.name} • {typeInfo.label}</p>
                              </div>
                            </div>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => handleEdit(record)}
                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeletingRecord(record)}
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar className="h-4 w-4 mr-2" />
                              <span>{new Date(record.date).toLocaleDateString()}</span>
                            </div>

                            {record.veterinarian && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Stethoscope className="h-4 w-4 mr-2" />
                                <span>{record.veterinarian}</span>
                              </div>
                            )}

                            {record.cost && (
                              <div className="flex items-center text-sm text-gray-600">
                                <DollarSign className="h-4 w-4 mr-2" />
                                <span>${record.cost}</span>
                              </div>
                            )}

                            {record.description && (
                              <p className="text-sm text-gray-700 line-clamp-3">
                                {record.description}
                              </p>
                            )}

                            {record.attachment_url && (
                              <a
                                href={record.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                View Attachment
                              </a>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">
                    {healthRecords.length === 0 ? 'No health records yet' : 'No records match your filters'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {healthRecords.length === 0 
                      ? 'Start tracking your pets\' health by adding their first record'
                      : 'Try adjusting your filters to see more records'
                    }
                  </p>
                  {healthRecords.length === 0 && (
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
                    >
                      <Plus className="h-5 w-5" />
                      <span>Add First Health Record</span>
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Add/Edit Health Record Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-full p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
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
                  <h2 className="text-xl font-semibold text-gray-900">
                    {editingRecord ? 'Edit Health Record' : 'Add Health Record'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  {/* Pet Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pet *
                    </label>
                    <select
                      required
                      value={formData.pet_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, pet_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a pet</option>
                      {pets.map(pet => (
                        <option key={pet.id} value={pet.id}>{pet.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Type and Title */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type *
                      </label>
                      <select
                        required
                        value={formData.type}
                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as HealthRecord['type'] }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {recordTypes.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Annual Checkup, Rabies Vaccination"
                      />
                    </div>
                  </div>

                  {/* Date and Veterinarian */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Veterinarian
                      </label>
                      <input
                        type="text"
                        value={formData.veterinarian}
                        onChange={(e) => setFormData(prev => ({ ...prev, veterinarian: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Dr. Smith, ABC Veterinary Clinic"
                      />
                    </div>
                  </div>

                  {/* Cost */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cost ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.cost}
                      onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Additional notes, symptoms, treatment details..."
                    />
                  </div>

                  {/* Attachment Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Attachment (Optional)
                    </label>
                    <div className="flex items-center space-x-4">
                      <label className="cursor-pointer bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2">
                        <Upload className="h-4 w-4" />
                        <span>Choose File</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={handleAttachmentUpload}
                          className="hidden"
                        />
                      </label>
                      {attachmentFile && (
                        <span className="text-sm text-gray-600">{attachmentFile.name}</span>
                      )}
                      {editingRecord?.attachment_url && !attachmentFile && (
                        <a
                          href={editingRecord.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          Current attachment
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Max 10MB. Supports PDF, DOC, DOCX, JPG, PNG</p>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        resetForm();
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
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          <span>{editingRecord ? 'Update Record' : 'Add Record'}</span>
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingRecord}
        onClose={() => setDeletingRecord(null)}
        onConfirm={handleDelete}
        title="Delete Health Record"
        message={`Are you sure you want to delete "${deletingRecord?.title}"? This action cannot be undone.`}
        confirmText="Delete Record"
        type="danger"
      />
    </div>
  );
};

export default Health;