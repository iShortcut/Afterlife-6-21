import { motion } from 'framer-motion';
import CalendarSyncSettings from '../components/calendar/CalendarSyncSettings';

const CalendarSettings = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <div className="mb-8">
          <h1 className="text-2xl font-serif text-slate-800 mb-2">Calendar Settings</h1>
          <p className="text-slate-600">
            Connect and manage your calendar integrations to sync memorial events.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <CalendarSyncSettings />
        </div>
      </motion.div>
    </div>
  );
};

export default CalendarSettings;