import React from 'react';
import { Pet } from '../../lib/supabase';
import { Heart, User } from 'lucide-react';

interface PetSelectorProps {
  pets: Pet[];
  selectedPetId: string;
  onPetSelect: (petId: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

const PetSelector: React.FC<PetSelectorProps> = ({
  pets,
  selectedPetId,
  onPetSelect,
  placeholder = 'Select a pet',
  className = '',
  required = false
}) => {
  return (
    <div className={className}>
      <select
        value={selectedPetId}
        onChange={(e) => onPetSelect(e.target.value)}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">{placeholder}</option>
        {pets.map(pet => (
          <option key={pet.id} value={pet.id}>
            {pet.name} ({pet.species})
          </option>
        ))}
      </select>
      
      {pets.length === 0 && (
        <p className="text-sm text-gray-500 mt-1">
          No pets found. <a href="/pets" className="text-blue-600 hover:text-blue-700">Add a pet first</a>
        </p>
      )}
    </div>
  );
};

export default PetSelector;
