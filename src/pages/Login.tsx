import { motion } from 'framer-motion';
import LoginForm from '../components/auth/LoginForm';

const Login = () => {
  return (
    <div className="container mx-auto px-4 py-16">
      <motion.div 
        className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="p-8">
          <h2 className="text-2xl font-serif text-center text-slate-800 mb-6">
            Welcome Back
          </h2>
          
          <LoginForm />
        </div>
      </motion.div>
    </div>
  );
};

export default Login;