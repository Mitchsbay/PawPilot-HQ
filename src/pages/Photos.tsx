import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase, Pet, uploadFile } from '../lib/supabase';
import { 
  Camera, Plus, Edit, Trash2, Heart, Share, Download,
  Grid, List, Search, Filter, X, Check, Upload,
  Eye, EyeOff, Users, Globe, Lock, MoreHorizontal,
  ChevronLeft, ChevronRight, ZoomIn, Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/UI/ConfirmDialog';

interface Album {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  cover_photo_url?: string;
  visibility: 'public' | 'friends' | 'private';
  photos_count: number;
  created_at: string;
  updated_at: string;
  photos?: AlbumPhoto[];
}

interface AlbumPhoto {
  id: string;
  album_id: string;
  photo_url: string;
  caption?: string;
  pet_id?: string;
  created_at: string;
  pets?: {
    name: string;
    species: string;
  };
}

const Photos: React.FC = () => {
  const { profile } = useAuth();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'friends' | 'private'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [deletingAlbum, setDeletingAlbum] = useState<Album | null>(null);
  const [showAddPhotosModal, setShowAddPhotosModal] = useState(false);

  // Create album form
  const [albumData, setAlbumData] = useState({
    name: '',
    description: '',
    visibility: 'public' as 'public' | 'friends' | 'private'
  });
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Add photos form
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [photoCaptions, setPhotoCaptions] = useState<string[]>([]);
  const [photoPetIds, setPhotoPetIds] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  useEffect(() => {
    if (profile) {
      loadAlbums();
      loadPets();
    }
  }, [profile, visibilityFilter]);

  const loadAlbums = async () => {
    if (!profile) return;

    try {
      let query = supabase
        .from('albums')
        .select(`
          *,
          album_photos(
            id,
            photo_url,
            caption,
            pet_id,
            created_at,
            pets(name, species)
          )
        `)
        .eq('owner_id', profile.id);

      // Apply visibility filter
      if (visibilityFilter !== 'all') {
        query = query.eq('visibility', visibilityFilter);
      }

      const { data, error } = await query
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading albums:', error);
        toast.error('Failed to load albums');
      } else {
        const albumsWithPhotos = (data || []).map(album => ({
          ...album,
          photos: album.album_photos || []
        }));
        setAlbums(albumsWithPhotos);
      }
    } catch (error) {
      console.error('Error loading albums:', error);
      toast.error('Failed to load albums');
    } finally {
      setLoading(false);
    }
  };

  const loadPets = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('owner_id', profile.id)
        .order('name');

      if (error) {
        console.error('Error loading pets:', error);
      } else {
        setPets(data || []);
      }
    } catch (error) {
      console.error('Error loading pets:', error);
    }
  };

  const handleCoverPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Cover photo must be less than 5MB');
        return;
      }
      
      setCoverPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setCoverPhotoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePhotosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (photoFiles.length + files.length > 20) {
      toast.error('Maximum 20 photos per upload');
      return;
    }

    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    setPhotoFiles(prev => [...prev, ...validFiles]);
    setPhotoCaptions(prev => [...prev, ...validFiles.map(() => '')]);
    setPhotoPetIds(prev => [...prev, ...validFiles.map(() => '')]);

    // Generate previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
    setPhotoCaptions(prev => prev.filter((_, i) => i !== index));
    setPhotoPetIds(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!albumData.name.trim()) {
      toast.error('Album name is required');
      return;
    }

    setSubmitting(true);

    try {
      let coverPhotoUrl = null;

      // Upload cover photo if provided
      if (coverPhotoFile) {
        const filename = `album_cover_${Date.now()}.${coverPhotoFile.name.split('.').pop()}`;
        coverPhotoUrl = await uploadFile('albumPhotos', filename, coverPhotoFile);
        
        if (!coverPhotoUrl) {
          toast.error('Failed to upload cover photo');
          setSubmitting(false);
          return;
        }
      }

      const newAlbum = {
        owner_id: profile.id,
        name: albumData.name.trim(),
        description: albumData.description.trim() || null,
        cover_photo_url: coverPhotoUrl,
        visibility: albumData.visibility,
        photos_count: 0
      };

      if (editingAlbum) {
        // Update existing album
        const { error } = await supabase
          .from('albums')
          .update(newAlbum)
          .eq('id', editingAlbum.id);

        if (error) {
          toast.error('Failed to update album');
          console.error('Error updating album:', error);
        } else {
          toast.success('Album updated successfully!');
          setShowCreateModal(false);
          resetCreateForm();
          loadAlbums();
        }
      } else {
        // Create new album
        const { error } = await supabase
          .from('albums')
          .insert(newAlbum);

        if (error) {
          toast.error('Failed to create album');
          console.error('Error creating album:', error);
        } else {
          toast.success('Album created successfully!');
          setShowCreateModal(false);
          resetCreateForm();
          loadAlbums();
        }
      }
    } catch (error) {
      console.error('Error creating album:', error);
      toast.error('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPhotos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlbum || photoFiles.length === 0) return;

    setUploadingPhotos(true);

    try {
      const photoInserts = [];

      // Upload each photo
      for (let i = 0; i < photoFiles.length; i++) {
        const file = photoFiles[i];
        const filename = `album_${selectedAlbum.id}_${Date.now()}_${i}.${file.name.split('.').pop()}`;
        const photoUrl = await uploadFile('albumPhotos', filename, file);
        
        if (photoUrl) {
          photoInserts.push({
            album_id: selectedAlbum.id,
            photo_url: photoUrl,
            caption: photoCaptions[i].trim() || null,
            pet_id: photoPetIds[i] || null
          });
        }
      }

      if (photoInserts.length === 0) {
        toast.error('Failed to upload photos');
        setUploadingPhotos(false);
        return;
      }

      // Insert photo records
      const { error } = await supabase
        .from('album_photos')
        .insert(photoInserts);

      if (error) {
        toast.error('Failed to add photos to album');
        console.error('Error adding photos:', error);
      } else {
        // Update album photos count
        await supabase
          .from('albums')
          .update({ 
            photos_count: selectedAlbum.photos_count + photoInserts.length,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedAlbum.id);

        toast.success(`${photoInserts.length} photo${photoInserts.length !== 1 ? 's' : ''} added successfully!`);
        setShowAddPhotosModal(false);
        resetPhotosForm();
        loadAlbums();
      }
    } catch (error) {
      console.error('Error adding photos:', error);
      toast.error('Something went wrong');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const resetCreateForm = () => {
    setAlbumData({
      name: '',
      description: '',
      visibility: 'public'
    });
    setCoverPhotoFile(null);
    setCoverPhotoPreview('');
    setEditingAlbum(null);
  };

  const resetPhotosForm = () => {
    setPhotoFiles([]);
    setPhotoPreviews([]);
    setPhotoCaptions([]);
    setPhotoPetIds([]);
  };

  const handleEditAlbum = (album: Album) => {
    setEditingAlbum(album);
    setAlbumData({
      name: album.name,
      description: album.description || '',
      visibility: album.visibility
    });
    setCoverPhotoPreview(album.cover_photo_url || '');
    setShowCreateModal(true);
  };

  const handleDeleteAlbum = async () => {
    if (!deletingAlbum) return;

    try {
      const { error } = await supabase
        .from('albums')
        .delete()
        .eq('id', deletingAlbum.id);

      if (error) {
        toast.error('Failed to delete album');
        console.error('Error deleting album:', error);
      } else {
        toast.success('Album deleted successfully');
        loadAlbums();
      }
    } catch (error) {
      console.error('Error deleting album:', error);
      toast.error('Failed to delete album');
    } finally {
      setDeletingAlbum(null);
    }
  };

  const openAlbumModal = (album: Album) => {
    setSelectedAlbum(album);
    setShowAlbumModal(true);
  };

  const openPhotoModal = (album: Album, photoIndex: number) => {
    setSelectedAlbum(album);
    setSelectedPhotoIndex(photoIndex);
    setShowPhotoModal(true);
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    if (!selectedAlbum?.photos) return;
    
    const totalPhotos = selectedAlbum.photos.length;
    if (direction === 'prev') {
      setSelectedPhotoIndex(prev => prev === 0 ? totalPhotos - 1 : prev - 1);
    } else {
      setSelectedPhotoIndex(prev => prev === totalPhotos - 1 ? 0 : prev + 1);
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public': return Globe;
      case 'friends': return Users;
      case 'private': return Lock;
      default: return Globe;
    }
  };

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'public': return 'text-green-600';
      case 'friends': return 'text-blue-600';
      case 'private': return 'text-gray-600';
      default: return 'text-green-600';
    }
  };

  const filteredAlbums = albums.filter(album =>
    album.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    album.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
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
          <h1 className="text-3xl font-bold text-gray-900">Photo Albums</h1>
          <p className="text-gray-600 mt-2">Organize and share your pet memories</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="mt-4 sm:mt-0 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create Album</span>
        </button>
      </div>

      {/* Filters and View Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-4">
          {/* Visibility Filter */}
          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Albums</option>
            <option value="public">Public</option>
            <option value="friends">Friends</option>
            <option value="private">Private</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search albums..."
            className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Albums Grid/List */}
      {filteredAlbums.length > 0 ? (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          : 'space-y-4'
        }>
          {filteredAlbums.map((album, index) => {
            const VisibilityIcon = getVisibilityIcon(album.visibility);
            
            return (
              <motion.div
                key={album.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow ${
                  viewMode === 'list' ? 'flex' : ''
                }`}
              >
                {/* Album Cover */}
                <div 
                  className={`relative cursor-pointer ${
                    viewMode === 'list' ? 'w-32 h-32 flex-shrink-0' : 'h-48'
                  }`}
                  onClick={() => openAlbumModal(album)}
                >
                  {album.cover_photo_url || (album.photos && album.photos.length > 0) ? (
                    <img
                      src={album.cover_photo_url || album.photos![0].photo_url}
                      alt={album.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <Camera className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  
                  {/* Photo Count Overlay */}
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                    {album.photos_count} photo{album.photos_count !== 1 ? 's' : ''}
                  </div>

                  {/* Visibility Badge */}
                  <div className="absolute top-2 left-2">
                    <VisibilityIcon className={`h-4 w-4 ${getVisibilityColor(album.visibility)}`} />
                  </div>
                </div>

                {/* Album Info */}
                <div className={`p-4 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{album.name}</h3>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleEditAlbum(album)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingAlbum(album)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {album.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{album.description}</p>
                  )}

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Updated {new Date(album.updated_at).toLocaleDateString()}</span>
                    <span className="capitalize">{album.visibility}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2 mt-4">
                    <button
                      onClick={() => openAlbumModal(album)}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      View Album
                    </button>
                    <button
                      onClick={() => {
                        setSelectedAlbum(album);
                        setShowAddPhotosModal(true);
                      }}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      Add Photos
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Camera className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            {searchTerm ? 'No albums match your search' : 'No photo albums yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm 
              ? 'Try adjusting your search terms'
              : 'Create your first album to organize and share your pet photos'
            }
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Create Your First Album</span>
            </button>
          )}
        </div>
      )}

      {/* Create/Edit Album Modal */}
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
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {editingAlbum ? 'Edit Album' : 'Create Album'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetCreateForm();
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleCreateAlbum} className="p-6 space-y-4">
                  {/* Cover Photo Upload */}
                  <div className="text-center">
                    <div className="relative inline-block">
                      {coverPhotoPreview ? (
                        <img
                          src={coverPhotoPreview}
                          alt="Cover preview"
                          className="w-32 h-32 rounded-lg object-cover border-4 border-gray-200"
                        />
                      ) : (
                        <div className="w-32 h-32 rounded-lg border-4 border-dashed border-gray-300 flex items-center justify-center">
                          <Camera className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                        <Camera className="h-3 w-3" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverPhotoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">Cover photo (optional)</p>
                  </div>

                  {/* Album Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Album Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={albumData.name}
                      onChange={(e) => setAlbumData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter album name"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={albumData.description}
                      onChange={(e) => setAlbumData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="What's this album about?"
                    />
                  </div>

                  {/* Visibility */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Visibility
                    </label>
                    <select
                      value={albumData.visibility}
                      onChange={(e) => setAlbumData(prev => ({ ...prev, visibility: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="public">🌍 Public - Anyone can see</option>
                      <option value="friends">👥 Friends - Only friends can see</option>
                      <option value="private">🔒 Private - Only you can see</option>
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        resetCreateForm();
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
                          <span>{editingAlbum ? 'Update Album' : 'Create Album'}</span>
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

      {/* Album View Modal */}
      <AnimatePresence>
        {showAlbumModal && selectedAlbum && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-full p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAlbumModal(false)}
                className="fixed inset-0 bg-black bg-opacity-50"
              />

              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedAlbum.name}</h2>
                    <p className="text-gray-600">{selectedAlbum.photos_count} photo{selectedAlbum.photos_count !== 1 ? 's' : ''}</p>
                  </div>
                  <button
                    onClick={() => setShowAlbumModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Album Description */}
                {selectedAlbum.description && (
                  <div className="px-6 py-4 border-b border-gray-200">
                    <p className="text-gray-700">{selectedAlbum.description}</p>
                  </div>
                )}

                {/* Photos Grid */}
                <div className="p-6">
                  {selectedAlbum.photos && selectedAlbum.photos.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {selectedAlbum.photos.map((photo, index) => (
                        <div
                          key={photo.id}
                          className="relative aspect-square cursor-pointer group"
                          onClick={() => openPhotoModal(selectedAlbum, index)}
                        >
                          <img
                            src={photo.photo_url}
                            alt={photo.caption || `Photo ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                            <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          {photo.caption && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2 rounded-b-lg">
                              <p className="text-xs truncate">{photo.caption}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Camera className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">No photos in this album yet</p>
                      <button
                        onClick={() => {
                          setShowAlbumModal(false);
                          setShowAddPhotosModal(true);
                        }}
                        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Add Photos
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Photo Viewer Modal */}
      <AnimatePresence>
        {showPhotoModal && selectedAlbum?.photos && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-90">
            <div className="flex items-center justify-center min-h-full p-4">
              {/* Close Button */}
              <button
                onClick={() => setShowPhotoModal(false)}
                className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
              >
                <X className="h-8 w-8" />
              </button>

              {/* Navigation Buttons */}
              {selectedAlbum.photos.length > 1 && (
                <>
                  <button
                    onClick={() => navigatePhoto('prev')}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10"
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </button>
                  <button
                    onClick={() => navigatePhoto('next')}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10"
                  >
                    <ChevronRight className="h-8 w-8" />
                  </button>
                </>
              )}

              {/* Photo */}
              <motion.div
                key={selectedPhotoIndex}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-4xl max-h-full"
              >
                <img
                  src={selectedAlbum.photos[selectedPhotoIndex].photo_url}
                  alt={selectedAlbum.photos[selectedPhotoIndex].caption || `Photo ${selectedPhotoIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                />
                
                {/* Photo Info */}
                {selectedAlbum.photos[selectedPhotoIndex].caption && (
                  <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-70 text-white p-4 rounded-lg">
                    <p>{selectedAlbum.photos[selectedPhotoIndex].caption}</p>
                    {selectedAlbum.photos[selectedPhotoIndex].pets && (
                      <p className="text-sm text-gray-300 mt-1">
                        Featuring {selectedAlbum.photos[selectedPhotoIndex].pets!.name}
                      </p>
                    )}
                  </div>
                )}

                {/* Photo Counter */}
                <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-lg text-sm">
                  {selectedPhotoIndex + 1} of {selectedAlbum.photos.length}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Photos Modal */}
      <AnimatePresence>
        {showAddPhotosModal && selectedAlbum && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-full p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setShowAddPhotosModal(false);
                  resetPhotosForm();
                }}
                className="fixed inset-0 bg-black bg-opacity-50"
              />

              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Add Photos to "{selectedAlbum.name}"
                  </h2>
                  <button
                    onClick={() => {
                      setShowAddPhotosModal(false);
                      resetPhotosForm();
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleAddPhotos} className="p-6">
                  {/* Photo Upload */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Photos (max 20)
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <label className="cursor-pointer">
                        <span className="text-blue-600 hover:text-blue-700 font-medium">
                          Choose photos
                        </span>
                        <span className="text-gray-600"> or drag and drop</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handlePhotosUpload}
                          className="hidden"
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB each</p>
                    </div>
                  </div>

                  {/* Photo Previews */}
                  {photoPreviews.length > 0 && (
                    <div className="space-y-4 mb-6">
                      <h3 className="font-medium text-gray-900">Photos to Upload ({photoPreviews.length})</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {photoPreviews.map((preview, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex space-x-4">
                              <img
                                src={preview}
                                alt={`Preview ${index + 1}`}
                                className="w-20 h-20 object-cover rounded-lg"
                              />
                              <div className="flex-1 space-y-2">
                                <input
                                  type="text"
                                  value={photoCaptions[index]}
                                  onChange={(e) => {
                                    const newCaptions = [...photoCaptions];
                                    newCaptions[index] = e.target.value;
                                    setPhotoCaptions(newCaptions);
                                  }}
                                  placeholder="Add a caption..."
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                                <select
                                  value={photoPetIds[index]}
                                  onChange={(e) => {
                                    const newPetIds = [...photoPetIds];
                                    newPetIds[index] = e.target.value;
                                    setPhotoPetIds(newPetIds);
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                  <option value="">No pet tagged</option>
                                  {pets.map(pet => (
                                    <option key={pet.id} value={pet.id}>{pet.name}</option>
                                  ))}
                                </select>
                              </div>
                              <button
                                type="button"
                                onClick={() => removePhoto(index)}
                                className="text-red-600 hover:text-red-700 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddPhotosModal(false);
                        resetPhotosForm();
                      }}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={uploadingPhotos || photoFiles.length === 0}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                    >
                      {uploadingPhotos ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          <span>Add {photoFiles.length} Photo{photoFiles.length !== 1 ? 's' : ''}</span>
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

      {/* Delete Album Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingAlbum}
        onClose={() => setDeletingAlbum(null)}
        onConfirm={handleDeleteAlbum}
        title="Delete Album"
        message={`Are you sure you want to delete "${deletingAlbum?.name}"? This will also delete all photos in the album. This action cannot be undone.`}
        confirmText="Delete Album"
        type="danger"
      />
    </div>
  );
};

export default Photos;