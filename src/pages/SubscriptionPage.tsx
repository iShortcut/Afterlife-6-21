import { motion } from 'framer-motion';
import SubscriptionOptions from '../components/subscription/SubscriptionOptions';

const SubscriptionPage = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-5xl mx-auto"
      >
        <div className="text-center mb-12">
          <h1 className="text-3xl font-serif text-slate-800 mb-4">
            Subscription Plans
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Choose a subscription plan that works for you and unlock premium features for your memorials.
          </p>
        </div>

        <SubscriptionOptions />
      </motion.div>
    </div>
  );
};

export default SubscriptionPage;