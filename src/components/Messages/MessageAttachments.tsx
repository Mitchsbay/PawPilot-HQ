import React, { useState } from 'react';
import { Paperclip, X, Download, Eye, FileText, Image, Video, Music } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase, MessageAttachment } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { telemetry } from '../../lib/telemetry';

interface MessageAttachmentsProps {
  messageId: string;
  attachments: MessageAttachment[];
  onAttachmentAdd?: (attachment: MessageAttachment) => void;
  showUpload?: boolean;
}

const MessageAttachments: React.FC<MessageAttachmentsProps> = ({
  messageId,
  attachments,
  onAttachmentAdd,
  showUpload = false
}) => {
  const { profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error('File must be less than 20MB');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Get signed upload URL
      const { data: urlData, error: urlError } = await supabase.functions.invoke('message-upload-url', {
        body: {
          message_id: messageId,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type
        }
      });

      if (urlError || !urlData.upload_url) {
        throw new Error('Failed to get upload URL');
      }

      // Upload file with progress tracking
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          setUploadProgress(progress);
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
        
        xhr.open('PUT', urlData.upload_url);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      // Create attachment record
      const newAttachment: MessageAttachment = {
        id: crypto.randomUUID(),
        message_id: messageId,
        file_path: urlData.file_path,
        mime_type: file.type,
        size_bytes: file.size,
        created_at: new Date().toISOString()
      };

      if (onAttachmentAdd) {
        onAttachmentAdd(newAttachment);
      }

      toast.success('File uploaded successfully!');
      telemetry.messages.attach({ file_type: file.type, file_size: file.size });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
      telemetry.messages.attach({ error: error.message });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.startsWith('video/')) return Video;
    if (mimeType.startsWith('audio/')) return Music;
    return FileText;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadAttachment = async (attachment: MessageAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('attachments')
        .download(attachment.file_path);

      if (error) {
        toast.error('Failed to download file');
        return;
      }

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.file_path.split('/').pop() || 'download';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      toast.error('Failed to download file');
    }
  };

  return (
    <div className="space-y-2">
      {/* Existing Attachments */}
      {attachments.map((attachment) => {
        const FileIcon = getFileIcon(attachment.mime_type);
        const isImage = attachment.mime_type.startsWith('image/');
        
        return (
          <motion.div
            key={attachment.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
          >
            <div className="p-2 bg-white rounded-lg">
              <FileIcon className="h-5 w-5 text-gray-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {attachment.file_path.split('/').pop()}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(attachment.size_bytes)}
              </p>
            </div>
            
            <div className="flex space-x-1">
              {isImage && (
                <button
                  onClick={() => {
                    // Open image preview modal
                    const { data } = supabase.storage
                      .from('attachments')
                      .getPublicUrl(attachment.file_path);
                    window.open(data.publicUrl, '_blank');
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                  title="Preview"
                >
                  <Eye className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => downloadAttachment(attachment)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        );
      })}

      {/* Upload Progress */}
      <AnimatePresence>
        {uploading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 bg-blue-50 rounded-lg"
          >
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">Uploading file...</p>
                <div className="w-full bg-blue-200 rounded-full h-2 mt-1">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
              <span className="text-sm text-blue-700">{Math.round(uploadProgress)}%</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Button */}
      {showUpload && (
        <label className="cursor-pointer">
          <input
            type="file"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
          />
          <div className="flex items-center space-x-2 p-2 text-gray-600 hover:text-blue-600 transition-colors">
            <Paperclip className="h-4 w-4" />
            <span className="text-sm">Attach file</span>
          </div>
        </label>
      )}
    </div>
  );
};

export default MessageAttachments;