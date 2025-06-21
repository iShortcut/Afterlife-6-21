import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, CreditCard, Flame, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext'; //  תוקן כאן
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'DIGITAL' | 'PHYSICAL' | 'SERVICE';
  metadata: {
    stripe_price_id: string;
    currency: string;
    duration_days?: number;
  };
}

interface ProductsProps {
  userId?: string;
  showOwned?: boolean;
  showFollowed?: boolean;
  className?: string;
  memorialId?: string;
}

const Products = ({
  userId,
  showOwned,
  showFollowed,
  className = '',
  memorialId
}: ProductsProps) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingProductId, setProcessingProductId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('price');

        if (fetchError) throw fetchError;
        setProducts(data || []);

      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products');
        toast.error('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handlePurchase = async (product: Product) => {
    if (!user) {
      toast.error('Please sign in to make a purchase');
      return;
    }

    if (product.type === 'DIGITAL' && !memorialId) {
      console.error('Missing memorialId for digital product purchase');
      toast.error('Cannot purchase product without a memorial context');
      return;
    }

    try {
      setProcessingProductId(product.id);

      const requestBody = {
        userId: user.id,
        productPriceId: product.metadata.stripe_price_id,
        quantity: 1,
        ...(product.type === 'DIGITAL' && memorialId && { memorialId })
      };

      const { data, error } = await supabase.functions.invoke(
        product.type === 'SERVICE' ? 'create-subscription-checkout' : 'create-product-checkout',
        { body: requestBody }
      );

      if (error) throw error;
      if (!data?.url) throw new Error('No checkout URL received');

      window.location.href = data.url;

    } catch (err) {
      console.error('Error initiating purchase:', err);
      toast.error('Failed to start purchase process');
      setProcessingProductId(null);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-6">
                <div className="h-6 bg-slate-200 rounded w-1/4 mb-4" />
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg text-center">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center py-12 bg-white rounded-lg">
            <Package className="mx-auto h-12 w-12 text-slate-300 mb-2" />
            <p className="text-slate-600">No products available at the moment</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-12">
            <h1 className="text-3xl font-serif text-slate-800 mb-4">
              Products & Subscriptions
            </h1>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Choose from our range of digital products and subscription plans to enhance your memorial experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map(product => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-white rounded-lg shadow-sm p-6 border-2 border-transparent hover:border-indigo-100 transition-colors"
              >
                <div className="flex flex-col h-full">
                  <div className="flex-grow">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                      {product.type === 'DIGITAL' ? (
                        <Flame size={24} className="text-indigo-600" />
                      ) : product.type === 'SERVICE' ? (
                        <CreditCard size={24} className="text-indigo-600" />
                      ) : (
                        <Package size={24} className="text-indigo-600" />
                      )}
                    </div>

                    <h3 className="text-xl font-medium text-slate-800 mb-2">
                      {product.name}
                    </h3>

                    <p className="text-2xl font-bold text-slate-900 mb-4">
                      {formatPrice(product.price, product.metadata.currency)}
                      {product.type === 'SERVICE' && (
                        <span className="text-sm font-normal text-slate-600">
                          /month
                        </span>
                      )}
                    </p>

                    <p className="text-slate-600 mb-6">
                      {product.description}
                    </p>

                    {product.metadata.duration_days && (
                      <p className="text-sm text-slate-500 mb-4">
                        Duration: {product.metadata.duration_days} days
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={() => handlePurchase(product)}
                    isLoading={processingProductId === product.id}
                    disabled={
                      !user ||
                      processingProductId === product.id ||
                      (product.type === 'DIGITAL' && !memorialId)
                    }
                    fullWidth
                    className="mt-4"
                  >
                    {processingProductId === product.id ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        <span>
                          {product.type === 'SERVICE' ? 'Subscribe' : 'Purchase'}
                        </span>
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Products;
