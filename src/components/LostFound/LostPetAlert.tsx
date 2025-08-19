import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase, LostFound } from '../../lib/supabase';
import { AlertTriangle, MapPin, Phone, Mail, DollarSign, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LostPetAlertProps {
  userLocation?: { lat: number; lng: number };
  radius?: number; // in miles
}

const LostPetAlert: React.FC<LostPetAlertProps> = ({ 
  userLocation, 
  radius = 10 
}) => {
  const { profile } = useAuth();
  const [nearbyLostPets, setNearbyLostPets] = useState<LostFound[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  useEffect(() => {
    if (profile && userLocation) {
      loadNearbyLostPets();
    }
  }, [profile, userLocation]);

  const loadNearbyLostPets = async () => {
    if (!profile || !userLocation) return;

    try {
      // Get lost pets within radius (simplified distance calculation)
      const { data, error } = await supabase
        .from('lost_found')
        .select(`
          *,
          profiles!lost_found_reporter_id_fkey(display_name, avatar_url)
        `)
        .eq('status', 'lost')
        .eq('is_resolved', false)
        .neq('reporter_id', profile.id) // Don't show user's own reports
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error loading nearby lost pets:', error);
      } else {
        // Filter by distance (simplified - in production would use PostGIS)
        const nearbyPets = (data || []).filter(pet => {
          const distance = calculateDistance(
            userLocation.lat, userLocation.lng,
            pet.latitude, pet.longitude
          );
          return distance <= radius;
        });

        // Filter out dismissed alerts
        const stored = localStorage.getItem('dismissed-lost-alerts');
        const dismissed = stored ? JSON.parse(stored) : [];
        setDismissedAlerts(dismissed);
        
        const visiblePets = nearbyPets.filter(pet => !dismissed.includes(pet.id));
        setNearbyLostPets(visiblePets);
      }
    } catch (error) {
      console.error('Error loading nearby lost pets:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const dismissAlert = (petId: string) => {
    const newDismissed = [...dismissedAlerts, petId];
    setDismissedAlerts(newDismissed);
    localStorage.setItem('dismissed-lost-alerts', JSON.stringify(newDismissed));
    setNearbyLostPets(prev => prev.filter(pet => pet.id !== petId));
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

  if (loading || nearbyLostPets.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {nearbyLostPets.map((pet, index) => (
        <motion.div
          key={pet.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-semibold text-red-800">Lost Pet Alert</h3>
                  <span className="text-xs text-red-600">{formatTimeAgo(pet.created_at)}</span>
                </div>
                <p className="text-red-700 font-medium">{pet.pet_name} - {pet.species}</p>
                <div className="flex items-center space-x-1 text-sm text-red-600 mb-2">
                  <MapPin className="h-3 w-3" />
                  <span>{pet.last_seen_location}</span>
                </div>
                <p className="text-sm text-red-700 line-clamp-2">{pet.description}</p>
                
                {pet.reward_offered && pet.reward_amount && (
                  <div className="flex items-center space-x-1 text-sm text-yellow-700 mt-2">
                    <DollarSign className="h-3 w-3" />
                    <span className="font-medium">${pet.reward_amount} reward</span>
                  </div>
                )}

                <div className="flex space-x-3 mt-3">
                  <a
                    href={`/lostfound#report-${pet.id}`}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    View Details →
                  </a>
                  {pet.contact_phone && (
                    <a
                      href={`tel:${pet.contact_phone}`}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Call Owner
                    </a>
                  )}
                </div>
              </div>
            </div>
            
            <button
              onClick={() => dismissAlert(pet.id)}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default LostPetAlert;