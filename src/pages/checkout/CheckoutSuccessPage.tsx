import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const CheckoutSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchaseDetails, setPurchaseDetails] = useState<any | null>(null);

  useEffect(() => {
    const verifyCheckout = async () => {
      if (!sessionId) {
        setError('Invalid checkout session');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Call an edge function to verify the checkout session
        const { data, error: verifyError } = await supabase.functions.invoke('verify-checkout-session', {
          body: { sessionId }
        });

        if (verifyError) throw verifyError;
        
        setPurchaseDetails(data);
      } catch (err) {
        console.error('Error verifying checkout:', err);
        setError('Failed to verify your purchase. Please contact support.');
      } finally {
        setLoading(false);
      }
    };

    verifyCheckout();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-md mx-auto">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mx-auto mb-4"></div>
          <h1 className="text-2xl font-serif text-slate-800 mb-4">
            Verifying your purchase...
          </h1>
          <p className="text-slate-600">
            Please wait while we confirm your transaction.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
          <div className="w-16 h-16 mx-auto mb-4 text-rose-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-serif text-slate-800 mb-4">
            Verification Failed
          </h1>
          <p className="text-slate-600 mb-6">
            {error}
          </p>
          <Link 
            to="/"
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800"
          >
            <ArrowLeft size={16} />
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8 text-center"
      >
        <div className="w-16 h-16 mx-auto mb-4 text-emerald-500">
          <CheckCircle size={64} />
        </div>
        
        <h1 className="text-2xl font-serif text-slate-800 mb-4">
          Thank You for Your Purchase!
        </h1>
        
        <p className="text-slate-600 mb-6">
          {purchaseDetails?.productType === 'DIGITAL' 
            ? 'Your digital candle has been lit successfully.'
            : 'Your purchase has been completed successfully.'}
        </p>
        
        {purchaseDetails?.memorialId && (
          <Link 
            to={`/memorials/${purchaseDetails.memorialId}`}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors inline-block mb-4"
          >
            Return to Memorial
          </Link>
        )}
        
        <div className="mt-4">
          <Link 
            to="/"
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800"
          >
            <ArrowLeft size={16} />
            <span>Return to Home</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default CheckoutSuccessPage;