import { useState } from 'react';
import { Share2, Copy, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface ShareEventButtonProps {
  eventId: string;
  eventTitle: string;
  variant?: 'button' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ShareEventButton = ({
  eventId,
  eventTitle,
  variant = 'button',
  size = 'md',
  className = ''
}: ShareEventButtonProps) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/events/${eventId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setCopied(true);
        toast.success('Link copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy link:', err);
        toast.error('Failed to copy link');
      });
  };

  const handleShare = async () => {
    // Use Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: eventTitle,
          text: `Check out this event: ${eventTitle}`,
          url: shareUrl
        });
        toast.success('Event shared successfully');
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing event:', err);
          setShowShareModal(true);
        }
      }
    } else {
      // Fallback to modal if Web Share API is not available
      setShowShareModal(true);
    }
  };

  // Button sizes
  const buttonSizes = {
    sm: 'text-sm py-1.5 px-3',
    md: 'py-2 px-4',
    lg: 'text-lg py-2.5 px-5'
  };

  // Icon sizes
  const iconSizes = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5'
  };

  return (
    <>
      {variant === 'button' ? (
        <Button
          onClick={handleShare}
          variant="outline"
          size={size}
          className={`flex items-center gap-2 ${className}`}
        >
          <Share2 size={size === 'lg' ? 20 : size === 'sm' ? 16 : 18} />
          <span>Share Event</span>
        </Button>
      ) : (
        <button
          onClick={handleShare}
          className={`rounded-full bg-white hover:bg-slate-100 text-slate-700 ${iconSizes[size]} ${className}`}
          aria-label="Share event"
        >
          <Share2 size={size === 'lg' ? 20 : size === 'sm' ? 16 : 18} />
        </button>
      )}

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setShowShareModal(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-50 w-full max-w-md p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-slate-800">Share Event</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-slate-400 hover:text-slate-600 rounded-full p-1"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-slate-600 mb-4">
                Share this event with friends and family:
              </p>

              <div className="flex items-center mb-6">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-grow px-3 py-2 border border-slate-300 rounded-l-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  onClick={handleCopyLink}
                  className={`px-3 py-2 rounded-r-md flex items-center gap-1.5 ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check size={16} />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={() => setShowShareModal(false)}
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default ShareEventButton;