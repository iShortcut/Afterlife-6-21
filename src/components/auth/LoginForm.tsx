import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
import Input from '../ui/Input';
import Button from '../ui/Button';

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginForm = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });

  const getErrorMessage = (error: any): string => {
    // Handle Supabase auth errors
    if (error?.message) {
      const message = error.message.toLowerCase();
      
      if (message.includes('invalid login credentials') || message.includes('invalid_credentials')) {
        return 'The email or password you entered is incorrect. Please check your credentials and try again.';
      }
      
      if (message.includes('email not confirmed')) {
        return 'Please check your email and click the confirmation link before signing in.';
      }
      
      if (message.includes('too many requests')) {
        return 'Too many login attempts. Please wait a few minutes before trying again.';
      }
      
      if (message.includes('network') || message.includes('fetch')) {
        return 'Network error. Please check your internet connection and try again.';
      }
      
      // Return the original message if it's user-friendly
      if (error.message.length < 100) {
        return error.message;
      }
    }
    
    // Fallback for any other errors
    return 'An error occurred during sign in. Please try again.';
  };

  const onSubmit: SubmitHandler<LoginFormData> = async (data) => {
    try {
      setLoading(true);
      setError(null);
      
      await signIn(data.email, data.password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-rose-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      <Input
        label="Email"
        type="email"
        placeholder="Enter your email"
        {...register('email')}
        error={errors.email?.message}
        required
      />
      
      <Input
        label="Password"
        type="password"
        placeholder="Enter your password"
        {...register('password')}
        error={errors.password?.message}
        required
      />
      
      <div className="text-right">
        <Link to="/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors">
          Forgot password?
        </Link>
      </div>
      
      <Button
        type="submit"
        isLoading={loading}
        fullWidth
        className="mt-2"
      >
        Sign In
      </Button>
      
      <div className="text-center text-sm text-slate-600">
        Don't have an account?{' '}
        <Link to="/register" className="text-indigo-600 hover:text-indigo-800 transition-colors">
          Create an account
        </Link>
      </div>
    </form>
  );
};

export default LoginForm;