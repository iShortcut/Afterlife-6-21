import React, { useState, useEffect } from 'react'; // <<< שורת ה-import תוקנה
import { motion } from 'framer-motion';
import { Package, CreditCard, AlignCenterVertical as Certificate, Award, MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import ServiceProviderDisplay from './ServiceProviderDisplay';
import toast from 'react-hot-toast';

interface StoreItemDisplayProps {
  memorialId?: string;
  className?: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'DIGITAL' | 'PHYSICAL' | 'SERVICE';
  is_active: boolean;
  metadata: {
    stripe_price_id: string;
    currency: string;
    duration_days?: number;
    product_type?: string;
    customization_options?: string[];
    has_service_providers?: boolean;
  };
}

const StoreItemDisplay = ({ memorialId, className = '' }: StoreItemDisplayProps) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingProductId, setProcessingProductId] = useState<string | null>(null);

  // State for personalization/customization
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [personalizationData, setPersonalizationData] = useState<Record<string, any>>({
    recipientName: '',
    message: '',
    date: '',
    material: 'wood',
    color: 'natural',
    size: 'medium',
    includePhoto: false,
    photoUrl: ''
  });

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setPersonalizationData(prev => ({ ...prev, [name]: checked }));
    } else {
      setPersonalizationData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);

    // Reset personalization data based on product type
    if (product.metadata.product_type === 'certificate') {
      setPersonalizationData({
        recipientName: '',
        message: '',
        date: new Date().toISOString().split('T')[0]
      });
    } else if (product.metadata.product_type === 'plaque') {
      setPersonalizationData({
        recipientName: '',
        message: '',
        date: new Date().toISOString().split('T')[0],
        material: 'wood',
        color: 'natural',
        size: 'medium'
      });
    } else if (product.metadata.product_type === 'greeting') {
      setPersonalizationData({
        recipientName: '',
        message: '',
        includePhoto: false,
        photoUrl: ''
      });
    } else {
      setPersonalizationData({});
    }
  };

  const validatePersonalization = () => {
    if (!selectedProduct) return false;

    const productType = selectedProduct.metadata.product_type;

    if (productType === 'certificate' || productType === 'plaque') {
      if (!personalizationData.recipientName.trim()) {
        toast.error('Recipient name is required');
        return false;
      }
    }

    if (productType === 'greeting' && personalizationData.includePhoto && !personalizationData.photoUrl.trim()) {
      toast.error('Photo URL is required when including a photo');
      return false;
    }

    return true;
  };

  const handlePurchase = async (product: Product) => {
    if (!user) {
      toast.error('Please sign in to make a purchase');
      return;
    }

    // If product has service providers, don't proceed to checkout
    if (product.metadata.has_service_providers) {
      return;
    }

    if (selectedProduct?.id === product.id && !validatePersonalization()) {
      return;
    }

    try {
      setProcessingProductId(product.id);

      const requestBody = {
        userId: user.id,
        productPriceId: product.metadata.stripe_price_id,
        quantity: 1,
        ...(memorialId && { memorialId }),
        personalizationDetails: selectedProduct?.id === product.id ? personalizationData : {}
      };

      const { data, error } = await supabase.functions.invoke('create-product-checkout', {
        body: requestBody
      });

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
      currency: currency || 'ILS'
    }).format(price);
  };

  const getProductIcon = (product: Product) => {
    const productType = product.metadata.product_type;

    if (productType === 'certificate') return Certificate;
    if (productType === 'plaque') return Award;
    if (productType === 'greeting') return MessageSquare;
    return Package;
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
    <div className={`space-y-8 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(product => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-lg shadow-sm p-6 border-2 border-transparent hover:border-indigo-100 transition-colors"
          >
            <div className="flex flex-col h-full">
              <div className="flex-grow">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                  {React.createElement(getProductIcon(product), { size: 24, className: "text-indigo-600" })}
                </div>

                <h3 className="text-xl font-medium text-slate-800 mb-2">
                  {product.name}
                </h3>

                <p className="text-2xl font-bold text-slate-900 mb-4">
                  {formatPrice(product.price, product.metadata.currency)}
                </p>

                <p className="text-slate-600 mb-6">
                  {product.description}
                </p>
              </div>

              <Button
                onClick={() => {
                  if (product.metadata.has_service_providers) {
                    handleProductSelect(product);
                  } else if (selectedProduct?.id === product.id) {
                    handlePurchase(product);
                  } else {
                    handleProductSelect(product);
                  }
                }}
                isLoading={processingProductId === product.id}
                disabled={!user || processingProductId === product.id}
                fullWidth
                className="mt-4"
              >
                {product.metadata.has_service_providers
                  ? 'View Service Providers'
                  : selectedProduct?.id === product.id
                    ? 'Continue to Checkout'
                    : 'Customize & Purchase'}
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Service Provider Display */}
      {selectedProduct?.metadata.has_service_providers && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-white rounded-lg shadow-sm p-6 border border-indigo-100"
        >
          <h3 className="text-xl font-medium text-slate-800 mb-4">
            Service Providers for {selectedProduct.name}
          </h3>

          <ServiceProviderDisplay
            productId={selectedProduct.id}
            memorialId={memorialId}
          />

          <div className="mt-6 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setSelectedProduct(null)}
              fullWidth
            >
              Back to Products
            </Button>
          </div>
        </motion.div>
      )}

      {/* Personalization Form */}
      {selectedProduct && !selectedProduct.metadata.has_service_providers && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-white rounded-lg shadow-sm p-6 border border-indigo-100"
        >
          <h3 className="text-xl font-medium text-slate-800 mb-4">
            Customize Your {selectedProduct.name}
          </h3>

          <div className="space-y-4">
            {/* Common fields for all products */}
            <Input
              label="Recipient Name"
              name="recipientName"
              value={personalizationData.recipientName}
              onChange={handleInputChange}
              placeholder="Enter recipient's name"
              required={['certificate', 'plaque'].includes(selectedProduct.metadata.product_type || '')}
            />

            <TextArea
              label="Message"
              name="message"
              value={personalizationData.message}
              onChange={handleInputChange}
              placeholder="Enter your personalized message"
              minRows={3}
            />

            {/* Date field for certificates and plaques */}
            {['certificate', 'plaque'].includes(selectedProduct.metadata.product_type || '') && (
              <Input
                type="date"
                label="Date to Display"
                name="date"
                value={personalizationData.date}
                onChange={handleInputChange}
              />
            )}

            {/* Plaque-specific options */}
            {selectedProduct.metadata.product_type === 'plaque' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Material
                    </label>
                    <select
                      name="material"
                      value={personalizationData.material}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-white border shadow-sm border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="wood">Wood</option>
                      <option value="metal">Metal</option>
                      <option value="glass">Glass</option>
                      <option value="acrylic">Acrylic</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Color
                    </label>
                    <select
                      name="color"
                      value={personalizationData.color}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-white border shadow-sm border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="natural">Natural</option>
                      <option value="black">Black</option>
                      <option value="silver">Silver</option>
                      <option value="gold">Gold</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Size
                    </label>
                    <select
                      name="size"
                      value={personalizationData.size}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-white border shadow-sm border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="small">Small (15x20cm)</option>
                      <option value="medium">Medium (20x30cm)</option>
                      <option value="large">Large (30x40cm)</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Greeting card-specific options */}
            {selectedProduct.metadata.product_type === 'greeting' && (
              <>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includePhoto"
                    name="includePhoto"
                    checked={personalizationData.includePhoto}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="includePhoto" className="text-sm text-slate-700">
                    Include a photo
                  </label>
                </div>

                {personalizationData.includePhoto && (
                  <Input
                    label="Photo URL"
                    name="photoUrl"
                    value={personalizationData.photoUrl}
                    onChange={handleInputChange}
                    placeholder="Enter URL of the photo to include"
                  />
                )}
              </>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setSelectedProduct(null)}
              >
                Cancel
              </Button>

              <Button
                onClick={() => handlePurchase(selectedProduct)}
                isLoading={processingProductId === selectedProduct.id}
              >
                Proceed to Checkout
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default StoreItemDisplay;