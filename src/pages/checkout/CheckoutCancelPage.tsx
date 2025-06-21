import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, XCircle } from 'lucide-react';

const CheckoutCancelPage = () => {
  return (
    <div className="container mx-auto px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8 text-center"
      >
        <div className="w-16 h-16 mx-auto mb-4 text-amber-500">
          <XCircle size={64} />
        </div>
        
        <h1 className="text-2xl font-serif text-slate-800 mb-4">
          Purchase Cancelled
        </h1>
        
        <p className="text-slate-600 mb-6">
          Your purchase has been cancelled. No charges were made to your account.
        </p>
        
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

export default CheckoutCancelPage;