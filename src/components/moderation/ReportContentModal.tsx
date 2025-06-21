import { useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import TextArea from '../ui/TextArea';
import toast from 'react-hot-toast';

interface ReportContentModalProps {
  contentType: 'POST' | 'COMMENT' | 'TRIBUTE' | 'MEMORIAL' | 'PROFILE';
  contentId: string;
  reportedUserId?: string;
  onClose: () => void;
}

const REPORT_REASONS = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'HARASSMENT', label: 'Harassment' },
  { value: 'INAPPROPRIATE', label: 'Inappropriate Content' },
  { value: 'HATE_SPEECH', label: 'Hate Speech' },
  { value: 'MISINFORMATION', label: 'Misinformation' },
  { value: 'OTHER', label: 'Other' }
] as const;

const ReportContentModal = ({
  contentType,
  contentId,
  reportedUserId,
  onClose
}: ReportContentModalProps) => {
  const { user } = useAuth();
  const [reason, setReason] = useState<typeof REPORT_REASONS[number]['value'] | ''>('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in to report content');
      return;
    }

    if (!reason) {
      toast.error('Please select a reason for reporting');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const { error: insertError } = await supabase
        .from('moderation_reports')
        .insert({
          reporter_id: user.id,
          content_type: contentType,
          content_id: contentId,
          reported_user_id: reportedUserId,
          reason,
          details: details.trim() || null,
          status: 'PENDING'
        });

      if (insertError) throw insertError;

      toast.success('Report submitted successfully');
      onClose();
    } catch (err) {
      console.error('Error submitting report:', err);
      setError('Failed to submit report. Please try again.');
      toast.error('Failed to submit report');
    } finally {
      setSubmitting(false);
    }
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
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h2 className="text-lg font-medium text-slate-800">Report Content</h2>
            <button
              onClick={onClose}
              className="p-1 text-slate-500 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4">
            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md">
                {error}
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Reason for reporting
              </label>
              <div className="space-y-2">
                {REPORT_REASONS.map(({ value, label }) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={value}
                      checked={reason === value}
                      onChange={(e) => setReason(e.target.value as typeof reason)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span className="text-slate-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <TextArea
              label="Additional Details (Optional)"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Please provide any additional information that will help us understand your report."
              minRows={3}
            />

            <div className="flex justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={submitting}
              >
                Submit Report
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  );
};

export default ReportContentModal;