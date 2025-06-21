import { motion } from 'framer-motion';
import ProfileForm from '../components/profile/ProfileForm';
// import Layout from '../components/layout/Layout'; // הסרנו את הייבוא הזה ואת העטיפה

const ProfileSettingsPage = () => {
  return (
    // <Layout>  <-- הסרנו את פתיחת התג הזה
      <div className="container mx-auto px-4 py-8">
        <motion.div
          className="max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              <h1 className="text-2xl font-serif text-slate-800 mb-6">
                Profile Settings
              </h1>
              <ProfileForm />
            </div>
          </div>
        </motion.div>
      </div>
    // </Layout> <-- הסרנו את סגירת התג הזו
  );
};

export default ProfileSettingsPage;