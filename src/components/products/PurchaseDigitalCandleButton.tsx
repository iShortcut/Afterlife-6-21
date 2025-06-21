import { useState } from 'react';
import { Flame, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import { reportError } from '../../utils/errorReporting';
import { trackEvent } from '../../utils/analytics';

interface PurchaseDigitalCandleButtonProps {
  memorialId: string;
  productId: string;
  productPriceId: string;
  productPrice: number;
  productCurrency: string;
  productName: string;
  onPurchaseStart?: () => void;
  onPurchaseComplete?: () => void;
  onError?: (error: Error) => void;
  className?: string;
  fullWidth?: boolean;
}

const PurchaseDigitalCandleButton = ({
  memorialId,
  productId,
  productPriceId,
  productPrice,
  productCurrency,
  productName,
  onPurchaseStart,
  onPurchaseComplete,
  onError,
  className = '',
  fullWidth = false
}: PurchaseDigitalCandleButtonProps) => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const formattedPrice = new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: productCurrency
  }).format(productPrice);

  const handlePurchase = async () => {
    if (!user) {
      toast.error('Please sign in to purchase a digital candle');
      return;
    }

    if (!productPriceId) {
      console.error('Missing product price ID');
      return;
    }

    try {
      setIsProcessing(true);
      onPurchaseStart?.();

      // Track purchase start event
      trackEvent('Ecommerce', 'Begin Checkout', productName, productPrice);

      const { data, error } = await supabase.functions.invoke('create-product-checkout', {
        body: {
          userId: user.id,
          productPriceId,
          quantity: 1,
          memorialId
        }
      });

      if (error) {
        // Report error to Sentry
        reportError(error, {
          userId: user.id,
          productId,
          memorialId,
          component: 'PurchaseDigitalCandleButton'
        });
        throw error;
      }
      
      if (!data?.url) throw new Error('No checkout URL received');

      // Redirect to Stripe Checkout
      window.location.href = data.url;
      onPurchaseComplete?.();

    } catch (err) {
      console.error('Error initiating purchase:', err);
      const error = err instanceof Error ? err : new Error('Failed to initiate purchase');
      toast.error('Failed to start purchase process. Please try again.');
      onError?.(error);
      
      // Report error to Sentry
      reportError(error, {
        userId: user.id,
        productId,
        memorialId,
        component: 'PurchaseDigitalCandleButton'
      });
      
      setIsProcessing(false);
    }
  };

  return (
    <Button
      onClick={handlePurchase}
      disabled={isProcessing || !user || !productPriceId}
      isLoading={isProcessing}
      className={`flex items-center gap-2 ${className}`}
      fullWidth={fullWidth}
    >
      {isProcessing ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Flame className="w-5 h-5" />
      )}
      <span>
        {`Light ${productName} (${formattedPrice})`}
      </span>
    </Button>
  );
};

export default PurchaseDigitalCandleButton;