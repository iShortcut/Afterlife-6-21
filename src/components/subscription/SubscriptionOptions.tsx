import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  metadata: {
    stripe_price_id: string;
    currency: string;
  };
}

interface Subscription {
  id: string;
  product_id: string;
  status: 'ACTIVE' | 'CANCELED' | 'EXPIRED' | 'PENDING';
  current_period_end: string;
  cancel_at_period_end: boolean;
  metadata: {
    stripe_customer_id: string;
  };
}

const SubscriptionOptions = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscriptionData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch active subscription plans
        const { data: plansData, error: plansError } = await supabase
          .from('products')
          .select('*')
          .eq('type', 'SERVICE')
          .eq('is_active', true);

        if (plansError) throw plansError;

        // Fetch user's current subscription
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['ACTIVE', 'TRIALING'])
          .maybeSingle();

        if (subscriptionError) throw subscriptionError;

        setPlans(plansData || []);
        setCurrentSubscription(subscriptionData);

      } catch (err) {
        console.error('Error fetching subscription data:', err);
        setError('Failed to load subscription information');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionData();
  }, [user]);

  const handleSubscribe = async (planPriceId: string, planId: string) => {
    if (!user) {
      toast.error('Please sign in to subscribe');
      return;
    }

    try {
      setProcessingPlanId(planId);
      setError(null);

      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: { userId: user.id, planPriceId }
      });

      if (error) throw error;
      if (!data.url) throw new Error('No checkout URL received');

      window.location.href = data.url;

    } catch (err) {
      console.error('Error creating subscription:', err);
      toast.error('Failed to start subscription process');
      setProcessingPlanId(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;

    try {
      setProcessingPlanId('manage');
      setError(null);

      const { data, error } = await supabase.functions.invoke('create-billing-portal', {
        body: { userId: user.id }
      });

      if (error) throw error;
      if (!data.url) throw new Error('No portal URL received');

      window.location.href = data.url;

    } catch (err) {
      console.error('Error accessing billing portal:', err);
      toast.error('Failed to open billing portal');
      setProcessingPlanId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {currentSubscription && (
        <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-indigo-900">
                Active Subscription
              </h3>
              <p className="text-sm text-indigo-700 mt-1">
                Your subscription is active until{' '}
                {new Date(currentSubscription.current_period_end).toLocaleDateString()}
              </p>
              {currentSubscription.cancel_at_period_end && (
                <p className="text-sm text-rose-600 mt-1">
                  Your subscription will end at the current period
                </p>
              )}
            </div>
            <Button
              onClick={handleManageSubscription}
              variant="outline"
              isLoading={processingPlanId === 'manage'}
              className="flex items-center gap-2"
            >
              <CreditCard size={18} />
              <span>Manage Subscription</span>
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map(plan => {
          const isCurrentPlan = currentSubscription?.product_id === plan.id;
          const formattedPrice = new Intl.NumberFormat('he-IL', {
            style: 'currency',
            currency: plan.metadata.currency || 'ILS'
          }).format(plan.price);

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`
                bg-white rounded-lg shadow-sm p-6 border-2
                ${isCurrentPlan ? 'border-indigo-500' : 'border-transparent'}
              `}
            >
              <div className="flex flex-col h-full">
                <div className="flex-grow">
                  <h3 className="text-xl font-medium text-slate-800">
                    {plan.name}
                  </h3>
                  <p className="text-2xl font-bold text-slate-900 mt-4">
                    {formattedPrice}
                    <span className="text-sm font-normal text-slate-600">
                      /month
                    </span>
                  </p>
                  <p className="mt-4 text-slate-600">
                    {plan.description}
                  </p>
                </div>

                <div className="mt-6">
                  {isCurrentPlan ? (
                    <div className="flex items-center justify-center gap-2 text-indigo-600 font-medium">
                      <Check size={20} />
                      <span>Current Plan</span>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleSubscribe(plan.metadata.stripe_price_id, plan.id)}
                      isLoading={processingPlanId === plan.id}
                      disabled={!!currentSubscription}
                      fullWidth
                    >
                      {currentSubscription ? 'Already Subscribed' : 'Subscribe'}
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default SubscriptionOptions;