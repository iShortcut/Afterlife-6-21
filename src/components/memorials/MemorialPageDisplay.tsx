import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  Edit, Lock, Calendar, Share2, MoreVertical, User, MapPin, Heart, Flame, ShoppingBag, 
  Globe, Users, ImageIcon // Ensure all used icons are imported
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import TributeSection from './TributeSection';
import TimelineSection from './TimelineSection';
import FamilyTreeSection from './FamilyTreeSection';
import VideoSection from './VideoSection';
import FollowButton from './FollowButton';
import ShareMemorialModal from './ShareMemorialModal';
import ReportContentButton from '../moderation/ReportContentButton';
import DonationModal from '../donation/DonationModal';
import PurchaseDigitalCandleButton from '../products/PurchaseDigitalCandleButton';
import SocialShareButtons from '../social/SocialShareButtons';
import ContentSuggestionWidget from '../ai/ContentSuggestionWidget';
import toast from 'react-hot-toast';
import { Memorial as MemorialType, Profile, Theme } from '../../types';

interface MemorialPageDisplayProps {
  memorialId: string;
}

interface MemorialWithDetails extends MemorialType {
  owner?: Pick<Profile, 'id' | 'full_name' | 'username' | 'avatar_url'> | null;
  theme?: Theme | null;
}

const MemorialPageDisplay = ({ memorialId }: MemorialPageDisplayProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [memorial, setMemorial] = useState<MemorialWithDetails | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [digitalCandleProduct, setDigitalCandleProduct] = useState<any | null>(null);

  const checkEditPermissions = useCallback(async (currentMemorialId: string, currentUserId: string) => {
    try {
      // Using parameter names as suggested by the RPC error hint
      const { data: rpcData, error: rpcError } = await supabase.rpc('can_edit_memorial', {
        memorial_id: currentMemorialId, 
        user_id: currentUserId      
      });
      if (rpcError) {
        console.error("Error in can_edit_memorial RPC:", rpcError);
        // PGRST202 means function not found with these exact parameters
        // This could happen if the DB function expects p_memorial_id but NOT p_user_id,
        // or if the function uses auth.uid() internally for user_id.
        // For now, default to false on error.
        // If the error persists, the DB function signature needs to be verified against this call.
        toast.error(`Permission check failed: ${rpcError.message}`);
        return false; 
      }
      return rpcData === true;
    } catch (e) {
      console.error('Exception checking edit permissions:', e);
      toast.error('An exception occurred while checking permissions.');
      return false;
    }
  }, []); // Removed supabase from dependencies as it's stable

  useEffect(() => {
    const fetchMemorial = async () => {
      if (!memorialId) {
        setError("Memorial ID is missing in props.");
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
        
      try {
        const { data, error: fetchError } = await supabase
          .from('memorials')
          .select(`
            *,
            owner:profiles!owner_id (
              id,
              full_name,
              username,
              avatar_url
            ),
            theme:themes!theme_id (*)
          `)
          .eq('id', memorialId)
          .single();
          
        if (fetchError) {
            console.error("Supabase request failed in fetchMemorial:", {
                message: fetchError.message,
                details: fetchError.details,
                hint: fetchError.hint,
                code: fetchError.code,
            });
            throw fetchError;
        }
        
        if (data) {
            const typedData = data as MemorialWithDetails;
            setMemorial(typedData);
            const currentUserId = user?.id;
            const memorialOwnerId = typedData.owner_id;
            setIsOwner(currentUserId === memorialOwnerId);
        
            if (user && typedData.id) {
                const editable = await checkEditPermissions(typedData.id, user.id);
                setCanEdit(editable);
            } else {
                setCanEdit(false);
            }

            if (typedData.theme?.css_variables) {
                Object.entries(typedData.theme.css_variables).forEach(([key, value]) => {
                    document.documentElement.style.setProperty(key, value as string);
                });
            }

            if (currentUserId !== memorialOwnerId) {
                const viewerId = currentUserId || null;
                let ipHash = null;
                if (!viewerId && typeof window !== 'undefined' && typeof navigator !== 'undefined') {
                    try {
                        ipHash = btoa(navigator.userAgent + Math.random().toString()).substring(0, 64);
                    } catch (e) { ipHash = 'error-hashing-ip'; }
                }
                const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 255) : null;
                supabase
                    .from('memorial_views')
                    .insert({
                    memorial_id: memorialId,
                    viewer_id: viewerId,
                    ip_hash: ipHash,
                    user_agent: userAgent
                    })
                    .then(({ error: viewError }) => {
                    if (viewError) console.error('Error recording view:', viewError.message);
                    });
            }
        } else {
            setError('Memorial data not found (null returned from Supabase).');
            toast.error('Memorial not found.');
        }
        
      } catch (err) {
        const typedError = err as any; 
        const errorMessage = typedError?.message || String(err);
        console.error('Error fetching memorial details:', typedError);
        
        if (typedError?.code === 'PGRST204' || errorMessage.includes('Row not found')) {
          setError('Memorial not found or access denied.');
          toast.error('Memorial not found or access denied.');
        } else if (errorMessage.includes('Policy')) {
          setError('Access to this memorial is restricted by policy.');
          toast.error('Access to this memorial is restricted.');
        } else {
          setError(`Failed to load memorial. Details: ${errorMessage}`);
          toast.error(`Failed to load memorial. ${typedError?.details || ''}`);
        }
      } 
    };
    
    const fetchDigitalCandleProduct = async () => {
      try {
        const { data, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('type', 'DIGITAL')
          .eq('name', 'נר דיגיטלי') 
          .eq('is_active', true)
          .maybeSingle(); 
          
        if (productError && productError.code !== 'PGRST116') { 
           console.error('Error fetching digital candle product:', productError);
           toast.error('Could not load digital candle details.');
           setDigitalCandleProduct(null); 
           return; 
        }
        setDigitalCandleProduct(data); 
        
      } catch (err) {
         console.error('Unexpected error fetching digital candle product:', err);
         toast.error('An unexpected error occurred while loading candle details.');
         setDigitalCandleProduct(null);
      }
    };
    
    Promise.allSettled([fetchMemorial(), fetchDigitalCandleProduct()]).finally(() => {
      setLoading(false); 
    });
    
    return () => {
      const cssVars = [
        '--memorial-primary-color',
        '--memorial-secondary-color',
        '--memorial-background-color',
        '--memorial-text-color',
        '--memorial-accent-color'
      ];
      if (typeof document !== 'undefined') {
        cssVars.forEach(variable => {
          document.documentElement.style.removeProperty(variable);
        });
      }
    };
  }, [memorialId, user, checkEditPermissions]);

  const formattedDates = () => {
    if (!memorial || (!memorial.birth_date && !memorial.death_date)) return 'Dates not specified';
    
    try {
      const birthDate = memorial.birth_date 
        ? format(new Date(memorial.birth_date), 'MMMM d, yyyy') // Corrected to yyyy
        : 'Unknown';
        
      const deathDate = memorial.death_date
        ? format(new Date(memorial.death_date), 'MMMM d, yyyy') // Corrected to yyyy
        : 'Present';
        
      if (birthDate === 'Unknown' && (deathDate === 'Present' || deathDate === 'Unknown')) return 'Dates not specified';

      return `${birthDate} - ${deathDate}`;
    } catch (e) {
      console.error("Error formatting dates:", e, memorial.birth_date, memorial.death_date);
      return "Invalid date(s)";
    }
  };

  const copyShareLink = () => {
    if (typeof window !== 'undefined' && typeof navigator.clipboard !== 'undefined') {
        const url = window.location.href;
        navigator.clipboard.writeText(url)
          .then(() => {
            toast.success('Link copied to clipboard!');
          })
          .catch(err => {
            console.error('Failed to copy link: ', err);
            toast.error('Failed to copy link. Please try again.');
          });
    } else {
        toast.error('Copying to clipboard is not supported in this environment.');
    }
  };

  const defaultCoverImage = "/placeholder-cover.jpg"; 
  const defaultProfileImage = "/placeholder-profile.jpg";

  // Use the correct property name from the memorial object
  const memorialName = memorial?.title || 'Untitled Memorial';
  // Define share variables conditionally based on memorial availability
  const currentShareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const currentShareTitle = memorial ? `Memorial: ${memorialName}` : 'Memorial';
  const currentShareDescription = memorial?.bio?.substring(0, 100) || (memorial ? `In memory of ${memorialName}` : 'A special memorial');


  if (loading) {
    return (
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
            <div className="max-w-md mx-auto mt-[-80px] relative z-10">
               <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-slate-300 dark:bg-slate-600 border-4 border-white dark:border-gray-800 mx-auto mb-4"></div>
               <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2 mx-auto"></div>
               <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mx-auto"></div>
            </div>
             <div className="max-w-2xl mx-auto pt-8">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      );
  }

  if (error || !memorial) { // Error or no memorial data after loading
    return (
        <div className="container mx-auto px-4 py-16 text-center flex items-center justify-center min-h-[calc(100vh-200px)]">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md max-w-lg mx-auto">
            <h2 className="text-2xl font-serif text-slate-800 dark:text-white mb-4">{error || 'Memorial Not Found'}</h2>
            <p className="text-slate-600 dark:text-gray-300 mb-6">
              {error === 'Memorial not found or access denied.' // Specific message for this common error
                ? "The memorial you're looking for doesn't exist, has been removed, or you don't have permission to view it."
                : `An unexpected error occurred. ${error || "Please try again later."}`}
            </p>
            <Link 
              to="/"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors inline-block"
            >
              Return Home
            </Link>
          </div>
        </div>
      );
  }
  
  // Memorial data is available from here onwards
  return (
    <div className="memorial-theme bg-slate-50 dark:bg-gray-900 min-h-screen">
      <div 
        className="h-64 md:h-80 lg:h-96 bg-cover bg-center relative group"
        style={{ backgroundImage: `url(${memorial.cover_image_url || defaultCoverImage})` }}
        role="img"
        aria-label={`Cover image for ${memorialName} memorial`}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent"></div>
        
        {memorial.visibility !== 'public' && (
          <div className="absolute top-4 right-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full flex items-center gap-1.5 text-xs sm:text-sm shadow">
            <Lock size={14} aria-hidden="true" />
            <span className="capitalize">{memorial.visibility?.replace('_', ' ')}</span>
          </div>
        )}
        
        <div className="absolute top-4 left-4 flex flex-col sm:flex-row gap-2 z-10">
          {(isOwner || canEdit) && (
            <Link
              to={`/edit-memorial/${memorial.id}`}
              className="bg-white bg-opacity-90 text-slate-800 px-3 py-1.5 rounded-md flex items-center gap-1.5 hover:bg-opacity-100 transition-colors shadow-sm text-sm font-medium"
              aria-label="Edit memorial"
            >
              <Edit size={16} aria-hidden="true" />
              <span>Edit</span>
            </Link>
          )}
          
          {user && !isOwner && memorial.id && (
            <FollowButton memorialId={memorial.id} />
          )}
        </div>
      </div>
      
      <div className="container mx-auto px-2 sm:px-4 relative pb-16">
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl -mt-20 md:-mt-24 mb-8 p-4 sm:p-6 md:p-8 relative z-10"
        >
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-center md:items-start">
            <div className="flex-shrink-0 -mt-16 md:-mt-28">
              <div 
                className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 sm:border-[6px] border-white dark:border-gray-800 bg-cover bg-center shadow-lg bg-slate-200 dark:bg-slate-700"
                style={{ backgroundImage: `url(${memorial.profile_image_url || defaultProfileImage})` }}
                role="img"
                aria-label={`Profile image for ${memorialName}`}
              />
            </div>
            
            <div className="flex-grow text-center md:text-left mt-4 md:mt-2 w-full">
              <motion.h1 
                className="text-2xl sm:text-3xl md:text-4xl font-serif text-slate-800 dark:text-white mb-1 sm:mb-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {memorialName}
              </motion.h1>
              
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 justify-center md:justify-start mb-3 sm:mb-4 text-sm sm:text-base">
                <Calendar size={16} aria-hidden="true" />
                <span>{formattedDates()}</span>
              </div>
              
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-2">
                <SocialShareButtons 
                  url={currentShareUrl}
                  title={currentShareTitle}
                  description={currentShareDescription}
                  size={28} 
                />
                 <button
                    onClick={copyShareLink}
                    className="inline-flex items-center justify-center p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title="Copy link"
                    aria-label="Copy memorial link"
                 >
                   <Share2 size={18} aria-hidden="true" />
                 </button>
              </div>
            </div>
            
             <div className="absolute top-3 right-3 flex gap-1">
               {user && (
                 <div className="relative">
                   <button
                     onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                     className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                     aria-label="More options"
                     aria-expanded={showMenu}
                     aria-haspopup="true"
                     id="memorial-options-menu-button"
                   >
                     <MoreVertical size={20} aria-hidden="true" />
                   </button>
                   
                   <AnimatePresence>
                     {showMenu && (
                       <motion.div 
                         initial={{ opacity: 0, y: -5, scale: 0.95 }}
                         animate={{ opacity: 1, y: 0, scale: 1 }}
                         exit={{ opacity: 0, y: -5, scale: 0.95 }}
                         transition={{ duration: 0.15 }}
                         className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-700 rounded-md shadow-lg z-30 py-1 ring-1 ring-black ring-opacity-5 focus:outline-none"
                         role="menu"
                         aria-orientation="vertical"
                         aria-labelledby="memorial-options-menu-button"
                         onClick={() => setShowMenu(false)} 
                       >
                         {memorial.id && memorial.owner_id && (
                            <ReportContentButton
                              contentType="MEMORIAL"
                              contentId={memorial.id}
                              reportedUserId={memorial.owner_id}
                              variant="menu-item"
                            />
                         )}
                       </motion.div>
                     )}
                   </AnimatePresence>
                 </div>
               )}
             </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8">
          <main className="lg:col-span-8 xl:col-span-8 space-y-6 md:space-y-8">
            {isOwner && memorial.id && (
              <ContentSuggestionWidget memorialId={memorial.id} className="mb-6" />
            )}
            
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-serif text-slate-800 dark:text-white mb-4">Biography</h2>
              <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                {memorial.bio || <p className="text-slate-500 dark:text-slate-400 italic">No biography has been provided for this memorial.</p>}
              </div>
            </section>
            
            {memorial.id && <TimelineSection memorialId={memorial.id} isOwner={isOwner || canEdit} />}
            {memorial.id && <FamilyTreeSection memorialId={memorial.id} isOwner={isOwner || canEdit} />}
            {memorial.id && <VideoSection memorialId={memorial.id} isOwner={isOwner || canEdit} />}
            {memorial.id && <TributeSection memorialId={memorial.id} />}
          </main>
          
          <aside className="lg:col-span-4 xl:col-span-4">
             <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 sticky top-24 space-y-6">
              <h2 className="text-lg sm:text-xl font-serif text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">About this Memorial</h2>
              
              {memorial.owner && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Created By</h3>
                  <Link 
                    to={user && user.id === memorial.owner.id ? `/dashboard?tab=about` : `/profile/${memorial.owner.id}`} 
                    className="flex items-center gap-2 group"
                  >
                    {memorial.owner.avatar_url ? (
                      <img 
                        src={memorial.owner.avatar_url} 
                        alt={memorial.owner.full_name || 'Creator'} 
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-transparent group-hover:border-indigo-500 transition-all"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 border-2 border-transparent group-hover:border-indigo-500 transition-all">
                         <User size={20} className="text-slate-400 dark:text-slate-500" aria-hidden="true" />
                      </div>
                    )}
                     <span
                       className="text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate text-sm font-medium"
                       title={memorial.owner.full_name || memorial.owner.username || 'Anonymous'}
                     >
                       {memorial.owner.full_name || memorial.owner.username || 'Anonymous'}
                     </span>
                  </Link>
                </div>
              )}
              
              <div>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Created On</h3>
                <p className="text-slate-700 dark:text-slate-300 text-sm">
                  {memorial.created_at ? format(new Date(memorial.created_at), 'MMMM d, yyyy') : 'N/A'}
                </p>
              </div>
              
              {memorial.location && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Location</h3>
                  <p className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-sm">
                    <MapPin size={14} className="text-slate-400 dark:text-slate-500 flex-shrink-0" aria-hidden="true" />
                    <span>{memorial.location}</span>
                  </p>
                </div>
              )}
              
              {memorial.theme && (
                 <div>
                   <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Theme</h3>
                   <p className="text-slate-700 dark:text-slate-300 text-sm">
                     {memorial.theme.name || 'Default Theme'}
                   </p>
                 </div>
              )}
              
              <div>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Visibility</h3>
                <p className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-sm">
                  {memorial.visibility === 'public' ? (
                    <Globe size={14} className="text-emerald-500 dark:text-emerald-400 flex-shrink-0" aria-hidden="true" />
                  ) : (
                    <Lock size={14} className="text-rose-500 dark:text-rose-400 flex-shrink-0" aria-hidden="true" />
                  )}
                  <span className="capitalize">{memorial.visibility?.replace('_', ' ')}</span>
                </p>
              </div>
              
               <div className="pt-4 mt-2 border-t border-slate-200 dark:border-slate-700">
                 <Link
                   to={`/store/${memorial.id}`} 
                   className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-md hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg text-sm font-medium"
                 >
                   <ShoppingBag size={18} />
                   <span>Memorial Store</span>
                 </Link>
               </div>
              
               {digitalCandleProduct && memorial.id && (
                 <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-700">
                   <PurchaseDigitalCandleButton
                     memorialId={memorial.id}
                     productId={digitalCandleProduct.id}
                     productPriceId={digitalCandleProduct.metadata?.stripe_price_id} 
                     productPrice={digitalCandleProduct.price}
                     productCurrency={digitalCandleProduct.metadata?.currency || 'USD'}
                     productName={digitalCandleProduct.name}
                     fullWidth
                   />
                 </div>
               )}
               
               {memorial.id && (
                  <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-700">
                    <Button
                      onClick={() => setShowDonationModal(true)}
                      variant="outline"
                      fullWidth
                      className="flex items-center gap-2 justify-center border-rose-500/50 text-rose-600 dark:border-rose-500/70 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:border-rose-500"
                    >
                      <Heart size={16} aria-hidden="true" />
                      <span>Make a Donation</span>
                    </Button>
                  </div>
               )}
               
               {isOwner && memorial.id && (
                 <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-700">
                   <Button
                     onClick={() => setShowShareModal(true)}
                     variant="outline"
                     fullWidth
                     className="flex items-center gap-2 justify-center"
                   >
                     <Share2 size={16} aria-hidden="true" />
                     <span>Manage Sharing</span>
                   </Button>
                 </div>
               )}
              
              <div className="pt-4 mt-2 border-t border-slate-200 dark:border-slate-700">
                <blockquote className="text-sm text-center text-slate-500 dark:text-slate-400 italic border-l-2 border-slate-300 dark:border-slate-600 pl-3 py-1">
                  "Their story lives on."
                </blockquote>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <AnimatePresence>
        {showShareModal && memorial.id && (
          <ShareMemorialModal
            memorialId={memorial.id}
            onClose={() => setShowShareModal(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDonationModal && memorial.id && (
          <DonationModal
            memorialId={memorial.id}
            onClose={() => setShowDonationModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MemorialPageDisplay;