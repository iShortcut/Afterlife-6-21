import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Copy, Check, Facebook, Twitter, Mail, Link as LinkIcon } from 'lucide-react';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface ShareEventModalProps {
  eventId: string;
  eventTitle: string;
  onClose: () => void;
}

const ShareEventModal = ({ eventId, eventTitle, onClose }: ShareEventModalProps) => {
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
  
  const handleShareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(`Check out this event: ${eventTitle}`)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };
  
  const handleShareTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out this event: ${eventTitle}`)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };
  
  const handleShareEmail = () => {
    const subject = encodeURIComponent(`Event Invitation: ${eventTitle}`);
    const body = encodeURIComponent(`I'd like to invite you to this event: ${eventTitle}\n\n${shareUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
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
            onClick={onClose}
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
        
        <div className="grid grid-cols-3 gap-4 mb-6">
          <button
            onClick={handleShareFacebook}
            className="flex flex-col items-center justify-center gap-2 p-3 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
          >
            <Facebook size={24} />
            <span className="text-sm">Facebook</span>
          </button>
          
          <button
            onClick={handleShareTwitter}
            className="flex flex-col items-center justify-center gap-2 p-3 bg-sky-50 text-sky-600 rounded-md hover:bg-sky-100 transition-colors"
          >
            <Twitter size={24} />
            <span className="text-sm">Twitter</span>
          </button>
          
          <button
            onClick={handleShareEmail}
            className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
          >
            <Mail size={24} />
            <span className="text-sm">Email</span>
          </button>
        </div>
        
        <div className="text-center">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </motion.div>
    </>
  );
};

export default ShareEventModal;