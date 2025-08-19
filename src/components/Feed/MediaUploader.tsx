import React, { useState, useCallback } from 'react';
import { useAuth } from '../../lib/auth';
import { uploadFile } from '../../lib/supabase';
import { BUCKETS } from '../../lib/buckets';
import { 
  Upload, X, Image, Video, File, Camera, 
  Loader, Check, AlertTriangle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface MediaFile {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'video' | 'document';
  uploading: boolean;
  uploaded: boolean;
  url?: string;
  error?: string;
}

interface MediaUploaderProps {
  onFilesUploaded: (urls: string[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  bucketKey?: keyof typeof BUCKETS;
  className?: string;
}

const MediaUploader: React.FC<MediaUploaderProps> = ({
  onFilesUploaded,
  maxFiles = 5,
  acceptedTypes = ['image/*', 'video/*'],
  bucketKey = 'postMedia',
  className = ''
}) => {
  const { profile } = useAuth();
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const getFileType = (file: File): 'image' | 'video' | 'document' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'document';
  };

  const generatePreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  const validateFile = (file: File): string | null => {
    // Check file type
    const isAccepted = acceptedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.replace('/*', '/'));
      }
      return file.type === type;
    });

    if (!isAccepted) {
      return `File type ${file.type} is not supported`;
    }

    // Check file size based on type
    const maxSizes = {
      image: 10 * 1024 * 1024, // 10MB
      video: 100 * 1024 * 1024, // 100MB
      document: 20 * 1024 * 1024 // 20MB
    };

    const fileType = getFileType(file);
    const maxSize = maxSizes[fileType];

    if (file.size > maxSize) {
      return `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`;
    }

    return null;
  };

  const handleFileSelect = useCallback(async (files: FileList) => {
    if (!profile) {
      toast.error('You must be logged in to upload files');
      return;
    }

    const fileArray = Array.from(files);
    
    if (mediaFiles.length + fileArray.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const validFiles: MediaFile[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        toast.error(`${file.name}: ${error}`);
        continue;
      }

      const preview = await generatePreview(file);
      validFiles.push({
        id: crypto.randomUUID(),
        file,
        preview,
        type: getFileType(file),
        uploading: false,
        uploaded: false
      });
    }

    if (validFiles.length > 0) {
      setMediaFiles(prev => [...prev, ...validFiles]);
    }
  }, [profile, mediaFiles.length, maxFiles, acceptedTypes]);

  const uploadFile_internal = async (mediaFile: MediaFile) => {
    if (!profile) return;

    setMediaFiles(prev => prev.map(f => 
      f.id === mediaFile.id ? { ...f, uploading: true, error: undefined } : f
    ));

    try {
      const filename = `${Date.now()}_${mediaFile.file.name}`;
      const url = await uploadFile(bucketKey, filename, mediaFile.file);

      if (url) {
        setMediaFiles(prev => prev.map(f => 
          f.id === mediaFile.id 
            ? { ...f, uploading: false, uploaded: true, url }
            : f
        ));
        return url;
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setMediaFiles(prev => prev.map(f => 
        f.id === mediaFile.id 
          ? { ...f, uploading: false, error: 'Upload failed' }
          : f
      ));
      return null;
    }
  };

  const uploadAllFiles = async () => {
    const unuploadedFiles = mediaFiles.filter(f => !f.uploaded && !f.uploading);
    
    if (unuploadedFiles.length === 0) {
      const uploadedUrls = mediaFiles.filter(f => f.uploaded && f.url).map(f => f.url!);
      onFilesUploaded(uploadedUrls);
      return;
    }

    const uploadPromises = unuploadedFiles.map(uploadFile_internal);
    const results = await Promise.all(uploadPromises);
    
    const successfulUrls = results.filter(Boolean) as string[];
    const failedCount = results.filter(r => !r).length;

    if (failedCount > 0) {
      toast.error(`${failedCount} file(s) failed to upload`);
    }

    if (successfulUrls.length > 0) {
      const allUploadedUrls = mediaFiles
        .filter(f => f.uploaded && f.url)
        .map(f => f.url!)
        .concat(successfulUrls);
      
      onFilesUploaded(allUploadedUrls);
    }
  };

  const removeFile = (fileId: string) => {
    setMediaFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const getFileIcon = (type: 'image' | 'video' | 'document') => {
    switch (type) {
      case 'image': return Image;
      case 'video': return Video;
      case 'document': return File;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <div className="space-y-2">
          <label className="cursor-pointer">
            <span className="text-blue-600 hover:text-blue-700 font-medium">
              Choose files
            </span>
            <span className="text-gray-600"> or drag and drop</span>
            <input
              type="file"
              multiple
              accept={acceptedTypes.join(',')}
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              className="hidden"
            />
          </label>
          <p className="text-xs text-gray-500">
            {acceptedTypes.includes('image/*') && 'Images up to 10MB, '}
            {acceptedTypes.includes('video/*') && 'Videos up to 100MB, '}
            Max {maxFiles} files
          </p>
        </div>
      </div>

      {/* File Previews */}
      <AnimatePresence>
        {mediaFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            {mediaFiles.map((mediaFile) => {
              const FileIcon = getFileIcon(mediaFile.type);
              
              return (
                <motion.div
                  key={mediaFile.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                >
                  {/* Preview */}
                  <div className="flex-shrink-0">
                    {mediaFile.type === 'image' ? (
                      <img
                        src={mediaFile.preview}
                        alt="Preview"
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                        <FileIcon className="h-6 w-6 text-gray-600" />
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {mediaFile.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(mediaFile.file.size)}
                    </p>
                    {mediaFile.error && (
                      <p className="text-xs text-red-600">{mediaFile.error}</p>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex items-center space-x-2">
                    {mediaFile.uploading && (
                      <Loader className="h-4 w-4 text-blue-600 animate-spin" />
                    )}
                    {mediaFile.uploaded && (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                    {mediaFile.error && (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <button
                      onClick={() => removeFile(mediaFile.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}

            {/* Upload All Button */}
            <div className="flex justify-end">
              <button
                onClick={uploadAllFiles}
                disabled={mediaFiles.every(f => f.uploaded || f.uploading)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                <Upload className="h-4 w-4" />
                <span>Upload All</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MediaUploader;