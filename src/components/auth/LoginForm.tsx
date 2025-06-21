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

  const onSubmit: SubmitHandler<LoginFormData> = async (data) => {
    try {
      setLoading(true);
      setError(null);
      
      await signIn(data.email, data.password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md">
          {error}
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
        <Link to="/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-800">
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
        <Link to="/register" className="text-indigo-600 hover:text-indigo-800">
          Create an account
        </Link>
      </div>
    </form>
  );
};

export default LoginForm;