import { motion } from 'framer-motion';
import DeveloperAPISettingsComponent from '../components/api/DeveloperAPISettings';

const DeveloperAPISettings = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-5xl mx-auto"
      >
        <div className="mb-8">
          <h1 className="text-2xl font-serif text-slate-800 mb-2">Developer API</h1>
          <p className="text-slate-600">
            Manage your API keys and access to the Memoriam API
          </p>
        </div>

        <DeveloperAPISettingsComponent />
      </motion.div>
    </div>
  );
};

export default DeveloperAPISettings;