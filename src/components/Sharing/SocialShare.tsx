import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share, X, Copy, ExternalLink, Facebook, Twitter, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

interface SocialShareProps {
  isOpen: boolean;
  onClose: () => void;
  content: {
    title: string;
    description: string;
    url: string;
    imageUrl?: string;
  };
}

const SocialShare: React.FC<SocialShareProps> = ({
  isOpen,
  onClose,
  content
}) => {
  const [copying, setCopying] = useState(false);

  const copyToClipboard = async () => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(content.url);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    } finally {
      setCopying(false);
    }
  };

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(content.url)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const shareToTwitter = () => {
    const text = `${content.title} - ${content.description}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(content.url)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(content.title);
    const body = encodeURIComponent(`${content.description}\n\nCheck it out: ${content.url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const shareViaNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: content.title,
          text: content.description,
          url: content.url
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
          toast.error('Failed to share');
        }
      }
    } else {
      copyToClipboard();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-full p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
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
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Share</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content Preview */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex space-x-3">
                {content.imageUrl && (
                  <img
                    src={content.imageUrl}
                    alt="Content preview"
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">{content.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{content.description}</p>
                </div>
              </div>
            </div>

            {/* Share Options */}
            <div className="p-4 space-y-3">
              {/* Native Share (if supported) */}
              {navigator.share && (
                <button
                  onClick={shareViaNative}
                  className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Share className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="font-medium text-gray-900">Share via...</span>
                </button>
              )}

              {/* Copy Link */}
              <button
                onClick={copyToClipboard}
                disabled={copying}
                className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="p-2 bg-gray-100 rounded-full">
                  <Copy className="h-5 w-5 text-gray-600" />
                </div>
                <span className="font-medium text-gray-900">
                  {copying ? 'Copying...' : 'Copy Link'}
                </span>
              </button>

              {/* Facebook */}
              <button
                onClick={shareToFacebook}
                className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="p-2 bg-blue-100 rounded-full">
                  <Facebook className="h-5 w-5 text-blue-600" />
                </div>
                <span className="font-medium text-gray-900">Share on Facebook</span>
              </button>

              {/* Twitter */}
              <button
                onClick={shareToTwitter}
                className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="p-2 bg-sky-100 rounded-full">
                  <Twitter className="h-5 w-5 text-sky-600" />
                </div>
                <span className="font-medium text-gray-900">Share on Twitter</span>
              </button>

              {/* Email */}
              <button
                onClick={shareViaEmail}
                className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="p-2 bg-green-100 rounded-full">
                  <Mail className="h-5 w-5 text-green-600" />
                </div>
                <span className="font-medium text-gray-900">Share via Email</span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default SocialShare;