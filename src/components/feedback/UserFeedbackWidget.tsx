import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Camera, Send, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import TextArea from '../ui/TextArea';
import Input from '../ui/Input';
import toast from 'react-hot-toast';

interface UserFeedbackWidgetProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  context?: string;
  className?: string;
}

type FeedbackType = 'bug' | 'feature' | 'improvement' | 'other';

const UserFeedbackWidget = ({
  position = 'bottom-right',
  context = window.location.pathname,
  className = ''
}: UserFeedbackWidgetProps) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('bug');
  const [message, setMessage] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setScreenshot(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
  };

  const resetForm = () => {
    setFeedbackType('bug');
    setMessage('');
    setScreenshot(null);
    setScreenshotPreview(null);
    setSubmitted(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    
    try {
      setSubmitting(true);
      
      let screenshotUrl = null;
      
      // Upload screenshot if provided
      if (screenshot) {
        const uniqueId = Date.now().toString();
        const ext = screenshot.name.split('.').pop();
        const path = `feedback/${user?.id || 'anonymous'}/${uniqueId}.${ext}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('media')
          .upload(path, screenshot, {
            cacheControl: '3600',
            upsert: true
          });
          
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('media')
          .getPublicUrl(path);
          
        screenshotUrl = urlData.publicUrl;
      }
      
      // Insert feedback into database
      const { error: insertError } = await supabase
        .from('user_feedback')
        .insert({
          user_id: user?.id || null,
          feedback_type: feedbackType,
          message: message.trim(),
          context,
          screenshot_url: screenshotUrl,
          browser_info: navigator.userAgent,
          status: 'new'
        });
        
      if (insertError) throw insertError;
      
      setSubmitted(true);
      toast.success('Feedback submitted successfully');
      
      // Close modal after a delay
      setTimeout(() => {
        setIsOpen(false);
        // Reset form after modal is closed
        setTimeout(resetForm, 300);
      }, 2000);
      
    } catch (err) {
      console.error('Error submitting feedback:', err);
      toast.error('Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Feedback Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed ${positionClasses[position]} z-40 bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-colors ${className}`}
        aria-label="Provide Feedback"
      >
        <MessageSquare size={24} />
      </button>
      
      {/* Feedback Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-lg shadow-xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between">
                <h3 className="font-medium">Provide Feedback</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/80 hover:text-white transition-colors"
                  aria-label="Close feedback form"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Content */}
              <div className="p-4">
                {submitted ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check size={32} className="text-green-600" />
                    </div>
                    <h4 className="text-xl font-medium text-slate-800 mb-2">Thank You!</h4>
                    <p className="text-slate-600">
                      Your feedback has been submitted successfully.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Feedback Type
                      </label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                          { value: 'bug', label: 'Bug' },
                          { value: 'feature', label: 'Feature Request' },
                          { value: 'improvement', label: 'Improvement' },
                          { value: 'other', label: 'Other' }
                        ].map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setFeedbackType(type.value as FeedbackType)}
                            className={`px-3 py-2 text-sm rounded-md ${
                              feedbackType === type.value
                                ? 'bg-indigo-100 text-indigo-700 font-medium'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <TextArea
                      label="Your Feedback"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Please describe your feedback in detail..."
                      minRows={4}
                      required
                    />
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Screenshot (Optional)
                      </label>
                      
                      {screenshotPreview ? (
                        <div className="relative">
                          <img
                            src={screenshotPreview}
                            alt="Screenshot preview"
                            className="w-full h-auto rounded-md border border-slate-200"
                          />
                          <button
                            type="button"
                            onClick={removeScreenshot}
                            className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-rose-100"
                          >
                            <X size={16} className="text-rose-600" />
                          </button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-slate-300 rounded-md p-4 text-center hover:border-indigo-400 transition-colors">
                          <input
                            type="file"
                            id="screenshot-upload"
                            accept="image/*"
                            className="hidden"
                            onChange={handleScreenshotChange}
                          />
                          <label
                            htmlFor="screenshot-upload"
                            className="cursor-pointer block"
                          >
                            <Camera className="mx-auto h-12 w-12 text-slate-400" />
                            <p className="mt-2 text-sm text-slate-600">
                              Click or drag and drop to upload a screenshot
                            </p>
                            <p className="text-xs text-slate-500">
                              PNG, JPG, GIF up to 10MB
                            </p>
                          </label>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-6">
                      <Button
                        type="submit"
                        isLoading={submitting}
                        fullWidth
                        className="flex items-center justify-center gap-2"
                      >
                        <Send size={18} />
                        <span>Submit Feedback</span>
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default UserFeedbackWidget;