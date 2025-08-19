import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase, Pet } from '../../lib/supabase';
import { Camera, Heart, Plus, Grid, List, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PetPhoto {
  id: string;
  photo_url: string;
  caption?: string;
  created_at: string;
}

interface PetGalleryProps {
  pet: Pet;
  limit?: number;
  showAddButton?: boolean;
}

const PetGallery: React.FC<PetGalleryProps> = ({ 
  pet, 
  limit = 6, 
  showAddButton = false 
}) => {
  const { profile } = useAuth();
  const [photos, setPhotos] = useState<PetPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<PetPhoto | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  useEffect(() => {
    loadPhotos();
  }, [pet.id]);

  const loadPhotos = async () => {
    try {
      // Get photos from posts and albums where this pet is tagged
      const { data: postPhotos } = await supabase
        .from('posts')
        .select('id, media_urls, created_at')
        .eq('pet_id', pet.id)
        .not('media_urls', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      const { data: albumPhotos } = await supabase
        .from('album_photos')
        .select('id, photo_url, caption, created_at')
        .eq('pet_id', pet.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Combine and format photos
      const allPhotos: PetPhoto[] = [];

      // Add post photos
      if (postPhotos) {
        postPhotos.forEach(post => {
          if (post.media_urls && post.media_urls.length > 0) {
            post.media_urls.forEach((url: string) => {
              allPhotos.push({
                id: `post-${post.id}-${url}`,
                photo_url: url,
                created_at: post.created_at
              });
            });
          }
        });
      }

      // Add album photos
      if (albumPhotos) {
        albumPhotos.forEach(photo => {
          allPhotos.push({
            id: photo.id,
            photo_url: photo.photo_url,
            caption: photo.caption,
            created_at: photo.created_at
          });
        });
      }

      // Sort by date and limit
      const sortedPhotos = allPhotos
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit);

      setPhotos(sortedPhotos);
    } catch (error) {
      console.error('Error loading pet photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const openPhotoModal = (photo: PetPhoto) => {
    setSelectedPhoto(photo);
    setShowPhotoModal(true);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {photos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {photos.map((photo, index) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="relative aspect-square cursor-pointer group"
                onClick={() => openPhotoModal(photo)}
              >
                <img
                  src={photo.photo_url}
                  alt={photo.caption || `${pet.name} photo`}
                  className="w-full h-full object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                  <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {photo.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2 rounded-b-lg">
                    <p className="text-xs truncate">{photo.caption}</p>
                  </div>
                )}
              </motion.div>
            ))}
            
            {showAddButton && (
              <div className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 transition-colors cursor-pointer">
                <div className="text-center">
                  <Plus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Add Photo</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Camera className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No photos yet</h3>
            <p className="text-gray-600">
              {pet.name}'s photos will appear here when you post or add them to albums
            </p>
          </div>
        )}
      </div>

      {/* Photo Modal */}
      <AnimatePresence>
        {showPhotoModal && selectedPhoto && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-90">
            <div className="flex items-center justify-center min-h-full p-4">
              <button
                onClick={() => setShowPhotoModal(false)}
                className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
              >
                <X className="h-8 w-8" />
              </button>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="max-w-4xl max-h-full"
              >
                <img
                  src={selectedPhoto.photo_url}
                  alt={selectedPhoto.caption || `${pet.name} photo`}
                  className="max-w-full max-h-full object-contain"
                />
                
                {selectedPhoto.caption && (
                  <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-70 text-white p-4 rounded-lg">
                    <p>{selectedPhoto.caption}</p>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PetGallery;