import { motion } from 'framer-motion';
import CommunityGroupsList from '../../components/community/CommunityGroupsList';

const CommunityGroups = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8">
          <h1 className="text-3xl font-serif text-slate-800 mb-2">Community Groups</h1>
          <p className="text-slate-600">
            Join groups to connect with others and share memories.
          </p>
        </div>
        
        <CommunityGroupsList />
      </motion.div>
    </div>
  );
};

export default CommunityGroups;