import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase, Pet } from '../../lib/supabase';
import { Calendar, Clock, Plus, Check, X, Bell, Stethoscope } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface Appointment {
  id: string;
  pet_id: string;
  title: string;
  description?: string;
  appointment_datetime: string;
  veterinarian?: string;
  location?: string;
  reminder_sent: boolean;
  created_at: string;
  pets: {
    name: string;
    species: string;
  };
}

const AppointmentReminders: React.FC = () => {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [appointmentData, setAppointmentData] = useState({
    pet_id: '',
    title: '',
    description: '',
    appointment_datetime: '',
    veterinarian: '',
    location: ''
  });
  const [submitting, setSubmitting] = useState(false);

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

      // Load upcoming appointments (stored as health records with future dates)
      const { data: appointmentsData } = await supabase
        .from('health_records')
        .select(`
          id,
          pet_id,
          title,
          description,
          date,
          veterinarian,
          created_at,
          pets!inner(name, species, owner_id)
        `)
        .eq('pets.owner_id', profile.id)
        .eq('type', 'checkup')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (appointmentsData) {
        // Transform to appointment format
        const transformedAppointments = appointmentsData.map(record => ({
          id: record.id,
          pet_id: record.pet_id,
          title: record.title,
          description: record.description,
          appointment_datetime: record.date + 'T09:00', // Default time
          veterinarian: record.veterinarian,
          location: '',
          reminder_sent: false,
          created_at: record.created_at,
          pets: record.pets
        }));
        
        setAppointments(transformedAppointments);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!appointmentData.pet_id || !appointmentData.title || !appointmentData.appointment_datetime) {
      toast.error('Pet, title, and date/time are required');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('health_records')
        .insert({
          pet_id: appointmentData.pet_id,
          type: 'checkup',
          title: appointmentData.title,
          description: appointmentData.description || null,
          date: appointmentData.appointment_datetime.split('T')[0],
          veterinarian: appointmentData.veterinarian || null
        });

      if (error) {
        toast.error('Failed to schedule appointment');
        console.error('Error scheduling appointment:', error);
      } else {
        toast.success('Appointment scheduled!');
        setShowAddModal(false);
        resetForm();
        loadData();
      }
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      toast.error('Failed to schedule appointment');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setAppointmentData({
      pet_id: '',
      title: '',
      description: '',
      appointment_datetime: '',
      veterinarian: '',
      location: ''
    });
  };

  const markCompleted = async (appointment: Appointment) => {
    try {
      const { error } = await supabase
        .from('health_records')
        .update({
          description: `${appointment.description || ''}\n\nCompleted on ${new Date().toLocaleDateString()}`
        })
        .eq('id', appointment.id);

      if (error) {
        toast.error('Failed to mark as completed');
        console.error('Error marking completed:', error);
      } else {
        toast.success('Appointment marked as completed!');
        loadData();
      }
    } catch (error) {
      console.error('Error marking completed:', error);
      toast.error('Failed to mark as completed');
    }
  };

  const getDaysUntilAppointment = (datetime: string) => {
    const appointment = new Date(datetime);
    const today = new Date();
    const diffTime = appointment.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgencyColor = (daysUntil: number) => {
    if (daysUntil < 0) return 'text-red-600 bg-red-50';
    if (daysUntil <= 1) return 'text-orange-600 bg-orange-50';
    if (daysUntil <= 7) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
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
          <h2 className="text-2xl font-bold text-gray-900">Appointment Reminders</h2>
          <p className="text-gray-600">Keep track of upcoming vet appointments</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Schedule Appointment</span>
        </button>
      </div>

      {/* Appointments List */}
      {appointments.length > 0 ? (
        <div className="space-y-4">
          {appointments.map((appointment, index) => {
            const daysUntil = getDaysUntilAppointment(appointment.appointment_datetime);
            const urgencyColor = getUrgencyColor(daysUntil);
            
            return (
              <motion.div
                key={appointment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-lg shadow-md p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-full ${urgencyColor}`}>
                      <Stethoscope className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{appointment.title}</h3>
                      <p className="text-sm text-gray-600">{appointment.pets.name}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(appointment.appointment_datetime).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(appointment.appointment_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${urgencyColor}`}>
                          {daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` :
                           daysUntil === 0 ? 'Today' :
                           daysUntil === 1 ? 'Tomorrow' :
                           `${daysUntil} days away`}
                        </span>
                      </div>
                      {appointment.veterinarian && (
                        <p className="text-sm text-gray-600 mt-1">Dr. {appointment.veterinarian}</p>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => markCompleted(appointment)}
                    className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    Mark Complete
                  </button>
                </div>
                
                {appointment.description && (
                  <p className="text-sm text-gray-700 mt-3 ml-16">{appointment.description}</p>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No upcoming appointments</h3>
          <p className="text-gray-600 mb-6">
            Schedule appointments to keep your pets healthy
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Schedule First Appointment</span>
          </button>
        </div>
      )}

      {/* Add Appointment Modal */}
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
                  <h2 className="text-xl font-semibold text-gray-900">Schedule Appointment</h2>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleAddAppointment} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pet *
                    </label>
                    <select
                      required
                      value={appointmentData.pet_id}
                      onChange={(e) => setAppointmentData(prev => ({ ...prev, pet_id: e.target.value }))}
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
                      Appointment Type *
                    </label>
                    <input
                      type="text"
                      required
                      value={appointmentData.title}
                      onChange={(e) => setAppointmentData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Annual Checkup, Dental Cleaning"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={appointmentData.appointment_datetime}
                      onChange={(e) => setAppointmentData(prev => ({ ...prev, appointment_datetime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Veterinarian
                    </label>
                    <input
                      type="text"
                      value={appointmentData.veterinarian}
                      onChange={(e) => setAppointmentData(prev => ({ ...prev, veterinarian: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Dr. Smith"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={appointmentData.location}
                      onChange={(e) => setAppointmentData(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Clinic name or address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={appointmentData.description}
                      onChange={(e) => setAppointmentData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Any special notes for this appointment..."
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
                          <span>Scheduling...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Schedule</span>
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

export default AppointmentReminders;