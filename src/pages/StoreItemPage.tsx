import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import StoreItemDisplay from '../components/products/StoreItemDisplay';

const StoreItemPage = () => {
  const { memorialId } = useParams<{ memorialId?: string }>();

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
            Memorial Store
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Choose from our selection of memorial products and services to honor and remember your loved ones.
          </p>
        </div>

        <StoreItemDisplay memorialId={memorialId} />
      </motion.div>
    </div>
  );
};

export default StoreItemPage;