import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Calendar, Weight, Palette, Edit, Trash2, MapPin, Shield } from 'lucide-react';
import { Pet } from '../../lib/supabase';

interface PetCardProps {
  pet: Pet;
  onEdit: () => void;
  onDelete: () => void;
  showActions?: boolean;
}

const PetCard: React.FC<PetCardProps> = ({ 
  pet, 
  onEdit, 
  onDelete, 
  showActions = true 
}) => {
  const calculateAge = (dateOfBirth: string) => {
    const birth = new Date(dateOfBirth);
    const today = new Date();
    const ageInMonths = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
    
    if (ageInMonths < 12) {
      return `${ageInMonths} month${ageInMonths !== 1 ? 's' : ''} old`;
    } else {
      const years = Math.floor(ageInMonths / 12);
      const months = ageInMonths % 12;
      if (months === 0) {
        return `${years} year${years !== 1 ? 's' : ''} old`;
      } else {
        return `${years}y ${months}m old`;
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Pet Photo */}
      <div className="relative h-48">
        {pet.photo_url ? (
          <img
            src={pet.photo_url}
            alt={pet.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
            <Heart className="h-12 w-12 text-gray-400" />
          </div>
        )}
        
        {/* Action Buttons */}
        {showActions && (
          <div className="absolute top-2 right-2 flex space-x-2">
            <button
              onClick={onEdit}
              className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
            >
              <Edit className="h-4 w-4 text-gray-600" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </button>
          </div>
        )}

        {/* Lost Badge */}
        {pet.is_lost && (
          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
            Lost
          </div>
        )}

        {/* Visibility Badge */}
        <div className="absolute bottom-2 left-2">
          <div className={`p-1 rounded-full ${
            pet.visibility === 'public' ? 'bg-green-500' :
            pet.visibility === 'friends' ? 'bg-blue-500' : 'bg-gray-500'
          }`}>
            {pet.visibility === 'public' ? (
              <div className="w-2 h-2 bg-white rounded-full" />
            ) : pet.visibility === 'friends' ? (
              <div className="w-2 h-2 bg-white rounded-full" />
            ) : (
              <Shield className="h-3 w-3 text-white" />
            )}
          </div>
        </div>
      </div>

      {/* Pet Info */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-semibold text-gray-900">{pet.name}</h3>
          <span className="text-sm text-gray-500 capitalize">{pet.species}</span>
        </div>

        {pet.breed && (
          <p className="text-gray-600 text-sm mb-2">{pet.breed}</p>
        )}

        <div className="space-y-2 text-sm text-gray-600">
          {pet.date_of_birth && (
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              <span>{calculateAge(pet.date_of_birth)}</span>
            </div>
          )}
          
          {pet.weight && (
            <div className="flex items-center">
              <Weight className="h-4 w-4 mr-2" />
              <span>{pet.weight} lbs</span>
            </div>
          )}
          
          {pet.color && (
            <div className="flex items-center">
              <Palette className="h-4 w-4 mr-2" />
              <span>{pet.color}</span>
            </div>
          )}
        </div>

        {pet.bio && (
          <p className="text-gray-700 text-sm mt-3 line-clamp-2">{pet.bio}</p>
        )}

        {/* Footer */}
        <div className="mt-3 flex justify-between items-center">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            pet.visibility === 'public' ? 'bg-green-100 text-green-800' :
            pet.visibility === 'friends' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {pet.visibility}
          </span>
          <Link
            to={`/health?pet=${pet.id}`}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Health Records →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PetCard;