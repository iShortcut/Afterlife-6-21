import { useState, useEffect } from 'react';
import { ExternalLink, Mail, Phone, MapPin, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import toast from 'react-hot-toast';

interface ServiceProviderDisplayProps {
  productId: string;
  memorialId?: string;
  className?: string;
}

interface ServiceProvider {
  id: string;
  name: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  website_url: string | null;
  address: string | null;
  logo_url: string | null;
  is_active: boolean;
}

const ServiceProviderDisplay = ({ productId, memorialId, className = '' }: ServiceProviderDisplayProps) => {
  const { user } = useAuth();
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchServiceProviders = async () => {
      try {
        setLoading(true);
        setError(null);

        // First get the product-provider mappings
        const { data: mappings, error: mappingError } = await supabase
          .from('product_provider_map')
          .select('provider_id')
          .eq('product_id', productId);

        if (mappingError) throw mappingError;

        if (!mappings || mappings.length === 0) {
          setProviders([]);
          return;
        }

        // Get the provider IDs
        const providerIds = mappings.map(mapping => mapping.provider_id);

        // Fetch the providers
        const { data: providersData, error: providersError } = await supabase
          .from('service_providers')
          .select('*')
          .in('id', providerIds)
          .eq('is_active', true);

        if (providersError) throw providersError;
        setProviders(providersData || []);

      } catch (err) {
        console.error('Error fetching service providers:', err);
        setError('Failed to load service providers');
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchServiceProviders();
    }
  }, [productId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleShowContactForm = (providerId: string) => {
    setSelectedProviderId(providerId);
    setShowContactForm(true);
    
    // Pre-fill form with user data if available
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.user_metadata?.full_name || prev.name,
        email: user.email || prev.email
      }));
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter your name');
      return false;
    }
    
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }
    
    if (!formData.message.trim()) {
      toast.error('Please enter a message');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setSubmitting(true);
      
      const { error } = await supabase.functions.invoke('send_service_inquiry', {
        body: {
          providerId: selectedProviderId,
          productId,
          memorialId,
          inquirerName: formData.name,
          inquirerEmail: formData.email,
          inquirerPhone: formData.phone,
          message: formData.message,
          userId: user?.id
        }
      });
      
      if (error) throw error;
      
      toast.success('Your inquiry has been sent successfully');
      setShowContactForm(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        message: ''
      });
      
    } catch (err) {
      console.error('Error sending inquiry:', err);
      toast.error('Failed to send inquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse space-y-4 ${className}`}>
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-6">
            <div className="h-6 bg-slate-200 rounded w-1/3 mb-4" />
            <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-slate-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg ${className}`}>
        {error}
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 text-center ${className}`}>
        <p className="text-slate-600">No service providers available for this product.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {showContactForm ? (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-medium text-slate-800 mb-4">
            Contact Service Provider
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Your Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your name"
              required
            />
            
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email"
              required
            />
            
            <Input
              label="Phone (Optional)"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Enter your phone number"
            />
            
            <TextArea
              label="Message"
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              placeholder="Enter your message to the service provider"
              minRows={4}
              required
            />
            
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowContactForm(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              
              <Button
                type="submit"
                isLoading={submitting}
              >
                <Send size={18} className="mr-2" />
                Send Inquiry
              </Button>
            </div>
          </form>
        </div>
      ) : (
        providers.map(provider => (
          <div key={provider.id} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {provider.logo_url && (
                <div className="flex-shrink-0">
                  <img 
                    src={provider.logo_url} 
                    alt={`${provider.name} logo`}
                    className="w-24 h-24 object-contain"
                  />
                </div>
              )}
              
              <div className="flex-grow">
                <h3 className="text-xl font-medium text-slate-800 mb-2">
                  {provider.name}
                </h3>
                
                <p className="text-slate-600 mb-4">
                  {provider.description}
                </p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail size={16} className="text-slate-400" />
                    <span>{provider.contact_email}</span>
                  </div>
                  
                  {provider.contact_phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone size={16} className="text-slate-400" />
                      <span>{provider.contact_phone}</span>
                    </div>
                  )}
                  
                  {provider.address && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin size={16} className="text-slate-400" />
                      <span>{provider.address}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {provider.website_url && (
                    <a
                      href={provider.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors text-sm"
                    >
                      <ExternalLink size={14} />
                      <span>Visit Website</span>
                    </a>
                  )}
                  
                  <Button
                    size="sm"
                    onClick={() => handleShowContactForm(provider.id)}
                  >
                    <Mail size={14} className="mr-1.5" />
                    Contact Provider
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ServiceProviderDisplay;