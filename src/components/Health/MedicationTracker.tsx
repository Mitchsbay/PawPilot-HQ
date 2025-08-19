import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase, Pet } from '../../lib/supabase';
import { 
  Pill, Plus, Clock, Calendar, AlertTriangle, 
  Check, X, Bell, Repeat, Edit, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import PetSelector from '../Pets/PetSelector';

interface Medication {
  id: string;
  pet_id: string;
  name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date?: string;
  instructions?: string;
  is_active: boolean;
  next_dose?: string;
  created_at: string;
  pets: {
    name: string;
    species: string;
  };
}

const MedicationTracker: React.FC = () => {
  const { profile } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [medicationData, setMedicationData] = useState({
    pet_id: '',
    name: '',
    dosage: '',
    frequency: 'daily',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    instructions: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const frequencyOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'twice_daily', label: 'Twice Daily' },
    { value: 'three_times_daily', label: 'Three Times Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'as_needed', label: 'As Needed' }
  ];

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [profile]);

  const loadData = async () => {
    if (!profile) return;

    try {
      // Load pets
      const { data: petsData } = await supabase
        .from('pets')
        .select('*')
        .eq('owner_id', profile.id)
        .order('name');

      setPets(petsData || []);

      // Load medications (stored as health records with type 'medication')
      const { data: medicationsData } = await supabase
        .from('health_records')
        .select(`
          id,
          pet_id,
          title,
          description,
          date,
          created_at,
          pets!inner(name, species, owner_id)
        `)
        .eq('pets.owner_id', profile.id)
        .eq('type', 'medication')
        .order('date', { ascending: false });

      if (medicationsData) {
        // Transform to medication format
        const transformedMedications = medicationsData.map(record => ({
          id: record.id,
          pet_id: record.pet_id,
          name: record.title,
          dosage: 'As prescribed', // Simplified
          frequency: 'daily',
          start_date: record.date,
          instructions: record.description,
          is_active: new Date(record.date) <= new Date(),
          created_at: record.created_at,
          pets: record.pets
        }));
        
        setMedications(transformedMedications);
      }
    } catch (error) {
      console.error('Error loading medications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!medicationData.pet_id || !medicationData.name || !medicationData.start_date) {
      toast.error('Pet, medication name, and start date are required');
      return;
    }

    setSubmitting(true);

    try {
      const description = [
        `Dosage: ${medicationData.dosage}`,
        `Frequency: ${medicationData.frequency}`,
        medicationData.end_date && `End date: ${medicationData.end_date}`,
        medicationData.instructions && `Instructions: ${medicationData.instructions}`
      ].filter(Boolean).join('\n');

      const { error } = await supabase
        .from('health_records')
        .insert({
          pet_id: medicationData.pet_id,
          type: 'medication',
          title: medicationData.name,
          description,
          date: medicationData.start_date
        });

      if (error) {
        toast.error('Failed to add medication');
        console.error('Error adding medication:', error);
      } else {
        toast.success('Medication added!');
        setShowAddModal(false);
        resetForm();
        loadData();
      }
    } catch (error) {
      console.error('Error adding medication:', error);
      toast.error('Failed to add medication');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setMedicationData({
      pet_id: '',
      name: '',
      dosage: '',
      frequency: 'daily',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      instructions: ''
    });
  };

  const toggleMedicationStatus = async (medication: Medication) => {
    try {
      const newStatus = !medication.is_active;
      const statusNote = newStatus ? 'Resumed' : 'Discontinued';
      
      const { error } = await supabase
        .from('health_records')
        .update({
          description: `${medication.instructions || ''}\n\n${statusNote} on ${new Date().toLocaleDateString()}`
        })
        .eq('id', medication.id);

      if (error) {
        toast.error('Failed to update medication status');
        console.error('Error updating medication:', error);
      } else {
        toast.success(`Medication ${statusNote.toLowerCase()}`);
        loadData();
      }
    } catch (error) {
      console.error('Error updating medication:', error);
      toast.error('Failed to update medication');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Medication Tracker</h2>
          <p className="text-gray-600">Track your pets' medications and dosing schedules</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Medication</span>
        </button>
      </div>

      {/* Medications List */}
      {medications.length > 0 ? (
        <div className="space-y-4">
          {medications.map((medication, index) => (
            <motion.div
              key={medication.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg shadow-md p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-full ${
                    medication.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Pill className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{medication.name}</h3>
                    <p className="text-sm text-gray-600">{medication.pets.name}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>{medication.dosage}</span>
                      <span>•</span>
                      <span className="capitalize">{medication.frequency.replace('_', ' ')}</span>
                      <span>•</span>
                      <span>Started {new Date(medication.start_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    medication.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {medication.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => toggleMedicationStatus(medication)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      medication.is_active
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {medication.is_active ? 'Discontinue' : 'Resume'}
                  </button>
                </div>
              </div>
              
              {medication.instructions && (
                <p className="text-sm text-gray-700 mt-3 ml-16">{medication.instructions}</p>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Pill className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No medications tracked</h3>
          <p className="text-gray-600 mb-6">
            Add medications to track dosing schedules and monitor your pets' treatments
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Add First Medication</span>
          </button>
        </div>
      )}

      {/* Add Medication Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-full p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAddModal(false)}
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
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Add Medication</h2>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleAddMedication} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pet *
                    </label>
                    <PetSelector
                      pets={pets}
                      selectedPetId={medicationData.pet_id}
                      onPetSelect={(petId) => setMedicationData(prev => ({ ...prev, pet_id: petId }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Medication Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={medicationData.name}
                      onChange={(e) => setMedicationData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Rimadyl, Heartgard"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dosage *
                      </label>
                      <input
                        type="text"
                        required
                        value={medicationData.dosage}
                        onChange={(e) => setMedicationData(prev => ({ ...prev, dosage: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 25mg, 1 tablet"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Frequency *
                      </label>
                      <select
                        required
                        value={medicationData.frequency}
                        onChange={(e) => setMedicationData(prev => ({ ...prev, frequency: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {frequencyOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={medicationData.start_date}
                        onChange={(e) => setMedicationData(prev => ({ ...prev, start_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date (optional)
                      </label>
                      <input
                        type="date"
                        value={medicationData.end_date}
                        onChange={(e) => setMedicationData(prev => ({ ...prev, end_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Instructions
                    </label>
                    <textarea
                      value={medicationData.instructions}
                      onChange={(e) => setMedicationData(prev => ({ ...prev, instructions: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Special instructions, side effects to watch for, etc."
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
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
                          <span>Adding...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Add Medication</span>
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
    </div>
  );
};

export default MedicationTracker;