import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import DonationForm from './DonationForm';

// Initialize Stripe (replace with your publishable key)
const stripePromise = loadStripe('pk_test_your_stripe_publishable_key');

interface DonationModalProps {
  memorialId: string;
  onClose: () => void;
}

const DonationModal = ({ memorialId, onClose }: DonationModalProps) => {
  const [donationSuccess, setDonationSuccess] = useState(false);

  const handleDonationSuccess = () => {
    setDonationSuccess(true);
    // Modal will be closed by the redirect from Stripe
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
            <h2 className="text-lg font-medium text-slate-800">Make a Donation</h2>
            <button
              onClick={onClose}
              className="p-1 text-slate-500 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-4">
            <Elements stripe={stripePromise}>
              <DonationForm 
                memorialId={memorialId} 
                onDonationSuccess={handleDonationSuccess} 
              />
            </Elements>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default DonationModal;