import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookHeart, Search, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Memorial } from '../types';
import MemorialCard from '../components/memorials/MemorialCard';
import Button from '../components/ui/Button';

const Home = () => {
  const [memorials, setMemorials] = useState<Memorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchPublicMemorials = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check if Supabase client is properly initialized
        if (!supabase) {
          throw new Error('Supabase client is not initialized');
        }
        
        // Fetch public memorials without using recursive policies
        const { data, error: fetchError } = await supabase
          .from('memorials')
          .select('id, title, bio, birth_date, death_date, visibility, profile_image_url, cover_image_url, owner_id, created_at')
          .eq('visibility', 'public')
          .order('created_at', { ascending: false })
          .limit(6);
          
        if (fetchError) {
          console.error('Supabase query error:', fetchError);
          throw new Error('Failed to fetch memorials');
        }

        // Get tribute counts in a separate query to avoid recursion
        const memorialsWithCounts = await Promise.all((data || []).map(async (memorial) => {
          try {
            const { count, error: countError } = await supabase
              .from('tributes')
              .select('*', { count: 'exact', head: true })
              .eq('memorial_id', memorial.id);
              
            if (countError) throw countError;
            
            return {
              ...memorial,
              tributes_count: count || 0
            };
          } catch (countErr) {
            console.error('Error fetching tribute count:', countErr);
            return {
              ...memorial,
              tributes_count: 0
            };
          }
        }));
        
        setMemorials(memorialsWithCounts);
      } catch (err) {
        console.error('Error in fetchPublicMemorials:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPublicMemorials();
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Track page view for analytics
  useEffect(() => {
    if (import.meta.env.PROD && window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: 'Home',
        page_location: window.location.href,
        page_path: window.location.pathname,
      });
    }
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-indigo-900 text-white">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ 
            backgroundImage: "url(https://images.pexels.com/photos/1606591/pexels-photo-1606591.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1)" 
          }}
          aria-hidden="true"
        />
        
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <BookHeart size={60} className="mx-auto mb-6 text-indigo-300" aria-hidden="true" />
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-medium mb-6">
              Honor Your Loved Ones with Digital Memorials
            </h1>
            
            <p className="text-lg md:text-xl text-indigo-100 mb-8">
              Create beautiful, lasting tributes to celebrate the lives and legacies of those who matter most.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/register" 
                className="px-6 py-3 bg-white text-indigo-900 rounded-md font-medium hover:bg-indigo-50 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-900"
              >
                Create a Memorial
              </Link>
              
              <Link 
                to="/login" 
                className="px-6 py-3 bg-indigo-800 text-white rounded-md font-medium hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-900"
              >
                Sign In
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* Featured Memorials */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-serif text-slate-800 mb-4">Featured Memorials</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Explore tributes created by our community to honor and remember loved ones.
          </p>
          
          <div className="mt-6 max-w-md mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search memorials..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 rounded-full border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                aria-label="Search memorials"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} aria-hidden="true" />
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-live="polite" aria-busy="true">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
                <div className="h-32 bg-slate-200 rounded mb-4" />
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg text-center" role="alert">
            {error}
          </div>
        ) : memorials.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No public memorials found. Be the first to create one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {memorials
              .filter(memorial => 
                searchQuery === '' || 
                memorial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (memorial.bio && memorial.bio.toLowerCase().includes(searchQuery.toLowerCase()))
              )
              .map(memorial => (
                <MemorialCard key={memorial.id} memorial={memorial} />
              ))}
          </div>
        )}
        
        <div className="text-center mt-12">
          <Link to="/register" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium">
            <span>Create your own memorial</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section className="bg-slate-50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif text-slate-800 mb-4">How It Works</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Creating and sharing a memorial is simple and meaningful.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-indigo-700 font-medium">1</span>
              </div>
              <h3 className="text-xl font-medium text-slate-800 mb-2">Create an Account</h3>
              <p className="text-slate-600">
                Sign up for free and gain access to all memorial creation tools.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-indigo-700 font-medium">2</span>
              </div>
              <h3 className="text-xl font-medium text-slate-800 mb-2">Create a Memorial</h3>
              <p className="text-slate-600">
                Add photos, stories, and details to honor your loved one's memory.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-indigo-700 font-medium">3</span>
              </div>
              <h3 className="text-xl font-medium text-slate-800 mb-2">Share & Remember</h3>
              <p className="text-slate-600">
                Invite others to view and contribute tributes to the memorial.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonials Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif text-slate-800 mb-4">What Our Users Say</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Hear from people who have created memorials for their loved ones.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-slate-50 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-indigo-700 font-medium">S</span>
                </div>
                <div>
                  <h3 className="font-medium text-slate-800">Sarah M.</h3>
                  <p className="text-sm text-slate-500">New York, USA</p>
                </div>
              </div>
              <p className="text-slate-600 italic">
                "Creating a memorial for my grandmother helped our family come together and share memories. The timeline feature is beautiful."
              </p>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-indigo-700 font-medium">J</span>
                </div>
                <div>
                  <h3 className="font-medium text-slate-800">James T.</h3>
                  <p className="text-sm text-slate-500">London, UK</p>
                </div>
              </div>
              <p className="text-slate-600 italic">
                "I was able to share my father's memorial with family across the world. It's become a place where we all contribute stories."
              </p>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-indigo-700 font-medium">M</span>
                </div>
                <div>
                  <h3 className="font-medium text-slate-800">Maria L.</h3>
                  <p className="text-sm text-slate-500">Toronto, Canada</p>
                </div>
              </div>
              <p className="text-slate-600 italic">
                "The family tree feature helped us document our history in a way that will be preserved for generations to come."
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Call to Action */}
      <section className="bg-indigo-700 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-serif mb-6">
            Create a Lasting Memorial Today
          </h2>
          <p className="text-indigo-100 max-w-2xl mx-auto mb-8">
            Honor your loved one with a beautiful digital memorial that can be shared and cherished for generations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/register" 
              className="px-8 py-3 bg-white text-indigo-700 rounded-md font-medium hover:bg-indigo-50 transition-colors inline-block focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-700"
            >
              Get Started
            </Link>
            <Link 
              to="/products" 
              className="px-8 py-3 bg-indigo-600 text-white border border-indigo-500 rounded-md font-medium hover:bg-indigo-600 transition-colors inline-block focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-700"
            >
              View Products
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;