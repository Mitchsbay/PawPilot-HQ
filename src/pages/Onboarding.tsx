import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Heart, Upload, User, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, uploadFile } from '../lib/supabase';
import toast from 'react-hot-toast';

const Onboarding: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const { profile, updateProfile } = useAuth();
  const navigate = useNavigate();

  // Step 1: Avatar upload
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  // Step 2: First pet
  const [petData, setPetData] = useState({
    name: '',
    species: 'dog',
    date_of_birth: '',
    photo: null as File | null,
    photoPreview: ''
  });

  // Step 3: Interests
  const [interests, setInterests] = useState<string[]>([]);

  const steps = [
    { title: 'Profile Photo', icon: User },
    { title: 'Add Your Pet', icon: Heart },
    { title: 'Pick Interests', icon: Check },
    { title: 'Finish Setup', icon: Check }
  ];

  const interestOptions = [
    'Dog Training', 'Cat Care', 'Pet Photography', 'Veterinary Advice',
    'Pet Nutrition', 'Grooming Tips', 'Pet Exercise', 'Animal Rescue',
    'Pet Travel', 'Pet Health', 'Pet Behavior', 'Pet Products'
  ];

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setAvatarPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePetPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPetData(prev => ({ ...prev, photo: file }));
      const reader = new FileReader();
      reader.onload = (e) => setPetData(prev => ({ 
        ...prev, 
        photoPreview: e.target?.result as string 
      }));
      reader.readAsDataURL(file);
    }
  };

  const nextStep = async () => {
    if (currentStep === 0 && avatarFile) {
      setLoading(true);
      try {
        const filename = `avatar_${Date.now()}.${avatarFile.name.split('.').pop()}`;
        avatarUrl = await uploadFile('avatars', filename, avatarFile);
        
        if (avatarUrl) {
          await updateProfile({ avatar_url: avatarUrl });
          toast.success('Profile photo uploaded!');
        }
      } catch (error) {
        toast.error('Failed to upload avatar');
      } finally {
        setLoading(false);
      }
    }

    if (currentStep === 1 && petData.name && petData.species) {
      setLoading(true);
      try {
        let photoUrl = null;
        
        if (petData.photo) {
          const filename = `pet_${Date.now()}.${petData.photo.name.split('.').pop()}`;
          photoUrl = await uploadFile('petPhotos', filename, petData.photo);
        }

        const { error } = await supabase
          .from('pets')
          .insert({
            owner_id: profile?.id,
            name: petData.name,
            species: petData.species,
            date_of_birth: petData.date_of_birth || null,
            photo_url: photoUrl,
            visibility: 'public'
          });

        if (error) {
          toast.error('Failed to add pet');
          return;
        }

        toast.success(`${petData.name} added successfully!`);
      } catch (error) {
        toast.error('Failed to add pet');
        return;
      } finally {
        setLoading(false);
      }
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Finish onboarding
      navigate('/dashboard');
      toast.success('Welcome to PawPilot HQ! 🐾');
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleInterest = (interest: string) => {
    setInterests(prev => 
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">PawPilot HQ</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome to PawPilot HQ!</h1>
          <p className="text-gray-600 mt-2">Let's set up your account in just a few steps</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                index <= currentStep
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-gray-300 text-gray-400'
              }`}>
                {index < currentStep ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-16 h-0.5 ml-2 ${
                  index < currentStep ? 'bg-blue-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white rounded-lg shadow-lg p-8"
        >
          <AnimatePresence mode="wait">
            {/* Step 1: Avatar Upload */}
            {currentStep === 0 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Upload Your Profile Photo
                </h2>
                <p className="text-gray-600 mb-8">
                  Add a photo so other pet parents can recognize you
                </p>

                <div className="flex flex-col items-center space-y-6">
                  <div className="relative">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="w-32 h-32 rounded-full object-cover border-4 border-blue-200"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full border-4 border-dashed border-gray-300 flex items-center justify-center">
                        <Upload className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="cursor-pointer bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                      Choose Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Add Pet */}
            {currentStep === 1 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                  Add Your First Pet
                </h2>
                <p className="text-gray-600 mb-8 text-center">
                  Tell us about your furry, feathered, or scaled friend
                </p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pet Name *
                    </label>
                    <input
                      type="text"
                      value={petData.name}
                      onChange={(e) => setPetData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="What's your pet's name?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Species *
                    </label>
                    <select
                      value={petData.species}
                      onChange={(e) => setPetData(prev => ({ ...prev, species: e.target.value }))}
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth (optional)
                    </label>
                    <input
                      type="date"
                      value={petData.date_of_birth}
                      onChange={(e) => setPetData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pet Photo (optional)
                    </label>
                    <div className="flex items-center space-x-4">
                      {petData.photoPreview && (
                        <img
                          src={petData.photoPreview}
                          alt="Pet preview"
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      )}
                      <label className="cursor-pointer bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                        Choose Photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePetPhotoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Interests */}
            {currentStep === 2 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                  What Are You Interested In?
                </h2>
                <p className="text-gray-600 mb-8 text-center">
                  Select topics that interest you to customize your experience
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {interestOptions.map((interest) => (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        interests.includes(interest)
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 4: Finish */}
            {currentStep === 3 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  You're All Set! 🎉
                </h2>
                <p className="text-gray-600 mb-8">
                  Welcome to PawPilot HQ! You can now start connecting with other pet parents, 
                  tracking your pet's health, and exploring all our features.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>
            
            <button
              onClick={nextStep}
              disabled={loading || (currentStep === 1 && (!petData.name || !petData.species))}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving...' : currentStep === 3 ? 'Get Started!' : 'Continue'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Onboarding;