import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
import Input from '../ui/Input';
import Button from '../ui/Button';

// Validation schema
const registerSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters').optional().or(z.literal('')),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password')
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

type RegisterFormData = z.infer<typeof registerSchema>;

const RegisterForm = () => {
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema)
  });

  const onSubmit: SubmitHandler<RegisterFormData> = async (data) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      await signUp(data.email, data.password, {
        data: {
          full_name: data.fullName,
          username: data.username || null
        }
      });
      
      setSuccess('Registration successful! Please check your email to confirm your account.');
    } catch (err) {
      console.error('Registration error:', err);
      
      if (err instanceof Error) {
        if (err.message.includes('already registered')) {
          setError('This email is already registered');
        } else if (err.message.includes('username')) {
          setError('This username is already taken');
        } else {
          setError(err.message);
        }
      } else {
        setError('An error occurred during registration');
      }
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
      
      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md">
          {success}
        </div>
      )}
      
      <Input
        label="Full Name"
        {...register('fullName')}
        placeholder="Enter your full name"
        error={errors.fullName?.message}
        required
      />
      
      <Input
        label="Username (optional)"
        {...register('username')}
        placeholder="Choose a username"
        error={errors.username?.message}
      />
      
      <Input
        label="Email"
        type="email"
        {...register('email')}
        placeholder="Enter your email"
        error={errors.email?.message}
        required
      />
      
      <Input
        label="Password"
        type="password"
        {...register('password')}
        placeholder="Create a password"
        error={errors.password?.message}
        required
      />
      
      <Input
        label="Confirm Password"
        type="password"
        {...register('confirmPassword')}
        placeholder="Confirm your password"
        error={errors.confirmPassword?.message}
        required
      />
      
      <Button
        type="submit"
        isLoading={loading}
        fullWidth
        className="mt-2"
      >
        Create Account
      </Button>
      
      <div className="text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="text-indigo-600 hover:text-indigo-800">
          Sign in
        </Link>
      </div>
    </form>
  );
};

export default RegisterForm;