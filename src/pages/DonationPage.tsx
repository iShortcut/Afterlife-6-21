import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import DonationForm from '../components/donation/DonationForm';

// Initialize Stripe (replace with your publishable key)
const stripePromise = loadStripe('pk_test_your_stripe_publishable_key');

const DonationPage = () => {
  const { memorialId } = useParams<{ memorialId: string }>();
  const [donationSuccess, setDonationSuccess] = useState(false);

  const handleDonationSuccess = () => {
    setDonationSuccess(true);
  };

  if (!memorialId) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 text-center">
          <h1 className="text-2xl font-serif text-slate-800 mb-4">Memorial Not Found</h1>
          <p className="text-slate-600">
            The memorial you're trying to donate to could not be found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md mx-auto"
      >
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <h1 className="text-2xl font-serif text-slate-800 mb-6 text-center">
              Make a Donation
            </h1>

            {donationSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-medium text-slate-800 mb-2">
                  Thank You for Your Donation
                </h2>
                <p className="text-slate-600 mb-6">
                  Your contribution is greatly appreciated.
                </p>
              </div>
            ) : (
              <Elements stripe={stripePromise}>
                <DonationForm
                  memorialId={memorialId}
                  onDonationSuccess={handleDonationSuccess}
                />
              </Elements>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DonationPage;