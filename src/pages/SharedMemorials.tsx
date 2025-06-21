import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import MemorialList from '../components/memorials/MemorialList';

const SharedMemorials = () => {
  return (
    <div className="container mx-auto px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-12">
          <h1 className="text-3xl font-serif text-slate-800 mb-4">
            Memorials Shared With You
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Memorials that others have shared with you.
          </p>
        </div>

        <MemorialList showShared />
      </motion.div>
    </div>
  );
};

export default SharedMemorials;