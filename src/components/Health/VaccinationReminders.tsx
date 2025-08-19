import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase, Pet } from '../../lib/supabase';
import { 
  Shield, Calendar, Bell, Plus, Check, X, 
  AlertTriangle, Clock, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface VaccinationReminder {
  id: string;
  pet_id: string;
  vaccine_name: string;
  due_date: string;
  is_completed: boolean;
  completed_date?: string;
  notes?: string;
  created_at: string;
  pets: {
    name: string;
    species: string;
  };
}

const VaccinationReminders: React.FC = () => {
  const { profile } = useAuth();
  const [reminders, setReminders] = useState<VaccinationReminder[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [reminderData, setReminderData] = useState({
    pet_id: '',
    vaccine_name: '',
    due_date: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const commonVaccines = {
    dog: [
      'Rabies', 'DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza)',
      'Bordetella (Kennel Cough)', 'Lyme Disease', 'Canine Influenza'
    ],
    cat: [
      'Rabies', 'FVRCP (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)',
      'FeLV (Feline Leukemia)', 'FIV (Feline Immunodeficiency Virus)'
    ],
    rabbit: [
      'RHDV (Rabbit Hemorrhagic Disease)', 'Myxomatosis'
    ],
    other: [
      'Species-specific vaccines', 'Annual wellness check'
    ]
  };

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [profile]);

  const loadData = async () => {
    if (!profile) return;

    try {
      // Load pets
      const { data: petsData, error: petsError } = await supabase
        .from('pets')
        .select('*')
        .eq('owner_id', profile.id)
        .order('name');

      if (petsError) {
        console.error('Error loading pets:', petsError);
      } else {
        setPets(petsData || []);
      }

      // Load vaccination reminders
      const { data: remindersData, error: remindersError } = await supabase
        .from('health_records')
        .select(`
          id,
          pet_id,
          title,
          date,
          description,
          created_at,
          pets!inner(name, species, owner_id)
        `)
        .eq('pets.owner_id', profile.id)
        .eq('type', 'vaccination')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (remindersError) {
        console.error('Error loading reminders:', remindersError);
      } else {
        // Transform health records to reminder format
        const transformedReminders = (remindersData || []).map(record => ({
          id: record.id,
          pet_id: record.pet_id,
          vaccine_name: record.title,
          due_date: record.date,
          is_completed: false,
          notes: record.description,
          created_at: record.created_at,
          pets: record.pets
        }));
        setReminders(transformedReminders);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!reminderData.pet_id || !reminderData.vaccine_name || !reminderData.due_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('health_records')
        .insert({
          pet_id: reminderData.pet_id,
          type: 'vaccination',
          title: reminderData.vaccine_name,
          description: reminderData.notes || null,
          date: reminderData.due_date
        });

      if (error) {
        toast.error('Failed to add vaccination reminder');
        console.error('Error adding reminder:', error);
      } else {
        toast.success('Vaccination reminder added!');
        setShowAddModal(false);
        resetForm();
        loadData();
      }
    } catch (error) {
      console.error('Error adding reminder:', error);
      toast.error('Failed to add reminder');
    } finally {
      setSubmitting(false);
    }
  };

  const markCompleted = async (reminder: VaccinationReminder) => {
    try {
      const { error } = await supabase
        .from('health_records')
        .update({
          description: `${reminder.notes || ''}\n\nCompleted on ${new Date().toLocaleDateString()}`
        })
        .eq('id', reminder.id);

      if (error) {
        toast.error('Failed to mark as completed');
        console.error('Error marking completed:', error);
      } else {
        toast.success('Vaccination marked as completed!');
        loadData();
      }
    } catch (error) {
      console.error('Error marking completed:', error);
      toast.error('Failed to mark as completed');
    }
  };

  const resetForm = () => {
    setReminderData({
      pet_id: '',
      vaccine_name: '',
      due_date: '',
      notes: ''
    });
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgencyColor = (daysUntil: number) => {
    if (daysUntil < 0) return 'text-red-600 bg-red-50';
    if (daysUntil <= 7) return 'text-orange-600 bg-orange-50';
    if (daysUntil <= 30) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getSelectedPetVaccines = () => {
    const selectedPet = pets.find(p => p.id === reminderData.pet_id);
    if (!selectedPet) return [];
    
    return commonVaccines[selectedPet.species] || commonVaccines.other;
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
          <h2 className="text-2xl font-bold text-gray-900">Vaccination Reminders</h2>
          <p className="text-gray-600">Keep your pets' vaccinations up to date</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Reminder</span>
        </button>
      </div>

      {/* Reminders List */}
      {reminders.length > 0 ? (
        <div className="space-y-4">
          {reminders.map((reminder, index) => {
            const daysUntil = getDaysUntilDue(reminder.due_date);
            const urgencyColor = getUrgencyColor(daysUntil);
            
            return (
              <motion.div
                key={reminder.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-lg shadow-md p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-full ${urgencyColor}`}>
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{reminder.vaccine_name}</h3>
                      <p className="text-sm text-gray-600">{reminder.pets.name}</p>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span>Due: {new Date(reminder.due_date).toLocaleDateString()}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${urgencyColor}`}>
                          {daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` :
                           daysUntil === 0 ? 'Due today' :
                           daysUntil === 1 ? 'Due tomorrow' :
                           `${daysUntil} days left`}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => markCompleted(reminder)}
                    className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    Mark Complete
                  </button>
                </div>
                
                {reminder.notes && (
                  <p className="text-sm text-gray-700 mt-3 ml-16">{reminder.notes}</p>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No vaccination reminders</h3>
          <p className="text-gray-600 mb-6">
            Add vaccination reminders to keep your pets healthy and protected
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Add First Reminder</span>
          </button>
        </div>
      )}

      {/* Add Reminder Modal */}
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
                  <h2 className="text-xl font-semibold text-gray-900">Add Vaccination Reminder</h2>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleAddReminder} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pet *
                    </label>
                    <select
                      required
                      value={reminderData.pet_id}
                      onChange={(e) => setReminderData(prev => ({ ...prev, pet_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a pet</option>
                      {pets.map(pet => (
                        <option key={pet.id} value={pet.id}>{pet.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vaccine *
                    </label>
                    <select
                      required
                      value={reminderData.vaccine_name}
                      onChange={(e) => setReminderData(prev => ({ ...prev, vaccine_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select vaccine</option>
                      {getSelectedPetVaccines().map(vaccine => (
                        <option key={vaccine} value={vaccine}>{vaccine}</option>
                      ))}
                      <option value="custom">Custom vaccine</option>
                    </select>
                  </div>

                  {reminderData.vaccine_name === 'custom' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Custom Vaccine Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={reminderData.vaccine_name}
                        onChange={(e) => setReminderData(prev => ({ ...prev, vaccine_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter vaccine name"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={reminderData.due_date}
                      onChange={(e) => setReminderData(prev => ({ ...prev, due_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={reminderData.notes}
                      onChange={(e) => setReminderData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Additional notes about this vaccination..."
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
                          <span>Add Reminder</span>
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

export default VaccinationReminders;