import { motion } from 'framer-motion';
import GroupCreateForm from '../../components/community/GroupCreateForm';

const CreateGroup = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto"
      >
        <div className="mb-8">
          <h1 className="text-3xl font-serif text-slate-800 mb-2">Create a Group</h1>
          <p className="text-slate-600">
            Start a community to connect with others who share your interests.
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <GroupCreateForm />
        </div>
      </motion.div>
    </div>
  );
};

export default CreateGroup;