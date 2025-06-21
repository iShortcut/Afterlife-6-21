import { useState, useEffect } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Heart, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import Button from '../ui/Button';

interface DonationFormProps {
  memorialId: string;
  onDonationSuccess?: () => void;
}

const DonationForm = ({ memorialId, onDonationSuccess }: DonationFormProps) => {
  const { user } = useAuth();
  const stripe = useStripe();
  const elements = useElements();

  const [formData, setFormData] = useState({
    amount: '',
    message: '',
    donorName: user?.user_metadata?.full_name || '',
    donorEmail: user?.email || '',
    isAnonymous: false
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    // Update donor info when user changes
    if (user && !formData.isAnonymous) {
      setFormData(prev => ({
        ...prev,
        donorName: user.user_metadata?.full_name || prev.donorName,
        donorEmail: user.email || prev.donorEmail
      }));
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked,
        ...(checked ? { donorName: '', donorEmail: '' } : {
          donorName: user?.user_metadata?.full_name || '',
          donorEmail: user?.email || ''
        })
      }));
    } else if (name === 'amount') {
      // Only allow numbers and one decimal point
      const sanitizedValue = value.replace(/[^\d.]/g, '');
      const parts = sanitizedValue.split('.');
      const formattedValue = parts.length > 1 
        ? `${parts[0]}.${parts[1].slice(0, 2)}`
        : sanitizedValue;
      setFormData(prev => ({ ...prev, [name]: formattedValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = () => {
    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) {
      setError('Please enter a valid donation amount');
      return false;
    }
    if (!formData.isAnonymous) {
      if (!formData.donorName.trim()) {
        setError('Please enter your name');
        return false;
      }
      if (!formData.donorEmail.trim() || !/\S+@\S+\.\S+/.test(formData.donorEmail)) {
        setError('Please enter a valid email address');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast.error('Payment system is not ready');
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      if (!clientSecret) {
        // Create payment intent
        const { data, error: intentError } = await supabase.functions.invoke('create-donation-intent', {
          body: {
            amount: parseFloat(formData.amount),
            currency: 'ILS',
            donorName: formData.isAnonymous ? 'Anonymous' : formData.donorName,
            donorEmail: formData.isAnonymous ? null : formData.donorEmail,
            memorialId,
            message: formData.message.trim() || null
          }
        });

        if (intentError) throw intentError;
        if (!data?.clientSecret) throw new Error('No client secret received');

        setClientSecret(data.clientSecret);
        return;
      }

      // Confirm payment
      const { error: stripeError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/memorials/${memorialId}?donation=success`,
        }
      });

      if (stripeError) {
        throw stripeError;
      }

      // User will be redirected by Stripe
      if (onDonationSuccess) {
        onDonationSuccess();
      }

    } catch (err) {
      console.error('Error processing donation:', err);
      setError(err instanceof Error ? err.message : 'Failed to process donation');
      toast.error('Failed to process donation');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md">
          {error}
        </div>
      )}

      <Input
        label="Donation Amount (₪)"
        name="amount"
        type="text"
        value={formData.amount}
        onChange={handleInputChange}
        placeholder="Enter amount"
        required
      />

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isAnonymous"
          name="isAnonymous"
          checked={formData.isAnonymous}
          onChange={handleInputChange}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <label htmlFor="isAnonymous" className="text-sm text-slate-700">
          Make this donation anonymous
        </label>
      </div>

      {!formData.isAnonymous && (
        <>
          <Input
            label="Your Name"
            name="donorName"
            value={formData.donorName}
            onChange={handleInputChange}
            placeholder="Enter your name"
            required
          />

          <Input
            label="Email"
            name="donorEmail"
            type="email"
            value={formData.donorEmail}
            onChange={handleInputChange}
            placeholder="Enter your email"
            required
          />
        </>
      )}

      <TextArea
        label="Message (Optional)"
        name="message"
        value={formData.message}
        onChange={handleInputChange}
        placeholder="Add a message with your donation"
        minRows={3}
      />

      {clientSecret && (
        <div className="py-4">
          <PaymentElement />
        </div>
      )}

      <Button
        type="submit"
        isLoading={isProcessing}
        disabled={!stripe || isProcessing}
        fullWidth
        className="flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Heart className="w-5 h-5" />
        )}
        <span>
          {clientSecret ? 'Complete Donation' : 'Continue to Payment'}
        </span>
      </Button>
    </form>
  );
};

export default DonationForm;