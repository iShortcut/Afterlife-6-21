import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Users, Mail, Search, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Input from '../ui/Input';
import Button from '../ui/Button';
import SocialShareButtons from '../social/SocialShareButtons';
import toast from 'react-hot-toast';

interface ShareMemorialModalProps {
  memorialId: string;
  onClose: () => void;
}

interface ShareRecipient {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface ExistingShare {
  id: string;
  shared_with_user_id: string | null;
  shared_with_email: string | null;
  permission_level: 'view' | 'edit';
  user?: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

const ShareMemorialModal = ({ memorialId, onClose }: ShareMemorialModalProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    userId: '',
    permissionLevel: 'view' as 'view' | 'edit'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ShareRecipient[]>([]);
  const [existingShares, setExistingShares] = useState<ExistingShare[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sharesLoading, setSharesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'invite' | 'social'>('invite');

  // Fetch existing shares
  useEffect(() => {
    const fetchExistingShares = async () => {
      if (!user) return;

      try {
        setSharesLoading(true);
        
        const { data, error: fetchError } = await supabase
          .from('memorial_shares')
          .select(`
            id,
            shared_with_user_id,
            shared_with_email,
            permission_level,
            user:shared_with_user_id (
              id,
              full_name,
              username,
              avatar_url
            )
          `)
          .eq('memorial_id', memorialId);
          
        if (fetchError) throw fetchError;
        
        setExistingShares(data || []);
      } catch (err) {
        console.error('Error fetching existing shares:', err);
        toast.error('Failed to load existing shares');
      } finally {
        setSharesLoading(false);
      }
    };
    
    fetchExistingShares();
  }, [memorialId, user]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    
    try {
      setSearchLoading(true);
      setError(null);
      
      const { data, error: searchError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
        .neq('id', user.id)
        .limit(5);
        
      if (searchError) throw searchError;
      
      setSearchResults(data || []);
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search users');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectUser = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      userId,
      email: '' // Clear email when selecting a user
    }));
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      email: e.target.value,
      userId: '' // Clear userId when entering an email
    }));
  };

  const handlePermissionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      permissionLevel: e.target.value as 'view' | 'edit'
    }));
  };

  const validateEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to share memorials');
      return;
    }
    
    if (!formData.email && !formData.userId) {
      setError('Please enter an email address or select a user');
      return;
    }
    
    if (formData.email && !validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const shareData = {
        memorial_id: memorialId,
        shared_by_user_id: user.id,
        shared_with_user_id: formData.userId || null,
        shared_with_email: formData.email || null,
        permission_level: formData.permissionLevel
      };
      
      const { error: insertError } = await supabase
        .from('memorial_shares')
        .insert(shareData);
        
      if (insertError) {
        if (insertError.code === '23505') { // Unique constraint violation
          throw new Error('This memorial has already been shared with this recipient');
        }
        throw insertError;
      }
      
      // Reset form
      setFormData({
        email: '',
        userId: '',
        permissionLevel: 'view'
      });
      
      // Refresh shares list
      const { data: newShares, error: fetchError } = await supabase
        .from('memorial_shares')
        .select(`
          id,
          shared_with_user_id,
          shared_with_email,
          permission_level,
          user:shared_with_user_id (
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('memorial_id', memorialId);
        
      if (fetchError) throw fetchError;
      
      setExistingShares(newShares || []);
      toast.success('Memorial shared successfully');
    } catch (err) {
      console.error('Error sharing memorial:', err);
      setError(err instanceof Error ? err.message : 'Failed to share memorial');
      toast.error(err instanceof Error ? err.message : 'Failed to share memorial');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    if (!user) return;
    
    if (!confirm('Are you sure you want to revoke this share?')) {
      return;
    }
    
    try {
      const { error: deleteError } = await supabase
        .from('memorial_shares')
        .delete()
        .eq('id', shareId)
        .eq('memorial_id', memorialId);
        
      if (deleteError) throw deleteError;
      
      // Update local state
      setExistingShares(prev => prev.filter(share => share.id !== shareId));
      toast.success('Share revoked successfully');
    } catch (err) {
      console.error('Error revoking share:', err);
      toast.error('Failed to revoke share');
    }
  };

  // Prepare share data
  const shareUrl = `${window.location.origin}/memorials/${memorialId}`;
  const shareTitle = "Memorial Page";
  const shareDescription = "I'd like to share this memorial page with you.";

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h2 className="text-lg font-medium text-slate-800">Share Memorial</h2>
            <button
              onClick={onClose}
              className="p-1 text-slate-500 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-4">
            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-4">
              <button
                onClick={() => setActiveTab('invite')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === 'invite'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Invite People
              </button>
              <button
                onClick={() => setActiveTab('social')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === 'social'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Social Share
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md">
                {error}
              </div>
            )}
            
            {activeTab === 'invite' ? (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Share with User
                    </label>
                    <div className="relative">
                      <Input
                        placeholder="Search for a user..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        icon={<Search size={18} className="text-slate-400" />}
                        className="mb-0"
                      />
                      <Button
                        type="button"
                        onClick={handleSearch}
                        size="sm"
                        className="absolute right-1 top-1"
                        isLoading={searchLoading}
                      >
                        Search
                      </Button>
                    </div>
                    
                    {searchResults.length > 0 && (
                      <div className="mt-2 border border-slate-200 rounded-md max-h-40 overflow-y-auto">
                        {searchResults.map(result => (
                          <div
                            key={result.id}
                            onClick={() => handleSelectUser(result.id)}
                            className="p-2 hover:bg-slate-50 cursor-pointer flex items-center gap-2"
                          >
                            {result.avatar_url ? (
                              <img
                                src={result.avatar_url}
                                alt={result.full_name || 'User'}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                <Users size={16} className="text-indigo-500" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-slate-800">
                                {result.full_name || 'Anonymous'}
                              </div>
                              {result.username && (
                                <div className="text-xs text-slate-500">
                                  @{result.username}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {formData.userId && (
                      <div className="mt-2 p-2 bg-indigo-50 border border-indigo-100 rounded-md flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users size={16} className="text-indigo-500" />
                          <span className="text-sm text-indigo-700">
                            User selected
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, userId: '' }))}
                          className="text-indigo-500 hover:text-indigo-700"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-slate-500">Or</span>
                    </div>
                  </div>

                  <Input
                    label="Share with Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleEmailChange}
                    placeholder="Enter email address"
                    icon={<Mail size={18} className="text-slate-400" />}
                    disabled={!!formData.userId}
                  />

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Permission Level
                    </label>
                    <select
                      value={formData.permissionLevel}
                      onChange={handlePermissionChange}
                      className="w-full px-3 py-2 bg-white border shadow-sm border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="view">View only</option>
                      <option value="edit">Edit</option>
                    </select>
                  </div>

                  <Button
                    type="submit"
                    isLoading={loading}
                    disabled={(!formData.email && !formData.userId) || loading}
                    fullWidth
                  >
                    Share Memorial
                  </Button>
                </form>

                {/* Existing Shares */}
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-slate-700 mb-2">
                    Shared With
                  </h3>
                  
                  {sharesLoading ? (
                    <div className="space-y-2">
                      {[...Array(2)].map((_, i) => (
                        <div key={i} className="animate-pulse flex items-center justify-between p-3 bg-slate-50 rounded-md">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
                            <div>
                              <div className="h-4 w-24 bg-slate-200 rounded"></div>
                              <div className="h-3 w-16 bg-slate-200 rounded mt-1"></div>
                            </div>
                          </div>
                          <div className="h-8 w-8 bg-slate-200 rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : existingShares.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-3">
                      This memorial hasn't been shared with anyone yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {existingShares.map(share => (
                        <div key={share.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
                          <div className="flex items-center gap-2">
                            {share.user ? (
                              <>
                                {share.user.avatar_url ? (
                                  <img
                                    src={share.user.avatar_url}
                                    alt={share.user.full_name || 'User'}
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                    <Users size={16} className="text-indigo-500" />
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium text-slate-800">
                                    {share.user.full_name || share.user.username || 'Anonymous'}
                                  </div>
                                  <div className="text-xs text-slate-500 flex items-center gap-1">
                                    <span className={`
                                      px-1.5 py-0.5 rounded-full text-xs
                                      ${share.permission_level === 'edit' 
                                        ? 'bg-indigo-100 text-indigo-700' 
                                        : 'bg-slate-100 text-slate-700'
                                      }
                                    `}>
                                      {share.permission_level}
                                    </span>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                  <Mail size={16} className="text-indigo-500" />
                                </div>
                                <div>
                                  <div className="font-medium text-slate-800">
                                    {share.shared_with_email}
                                  </div>
                                  <div className="text-xs text-slate-500 flex items-center gap-1">
                                    <span className={`
                                      px-1.5 py-0.5 rounded-full text-xs
                                      ${share.permission_level === 'edit' 
                                        ? 'bg-indigo-100 text-indigo-700' 
                                        : 'bg-slate-100 text-slate-700'
                                      }
                                    `}>
                                      {share.permission_level}
                                    </span>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                          
                          <button
                            onClick={() => handleRevokeShare(share.id)}
                            className="text-rose-500 hover:text-rose-700 p-1 rounded-full hover:bg-rose-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <p className="text-slate-600">
                  Share this memorial page on social media or via email.
                </p>
                
                <div className="flex justify-center py-4">
                  <SocialShareButtons
                    url={shareUrl}
                    title={shareTitle}
                    description={shareDescription}
                    size={40}
                  />
                </div>
                
                <div className="bg-slate-50 p-4 rounded-md">
                  <p className="text-sm text-slate-600 mb-2">Direct link:</p>
                  <div className="flex">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-grow px-3 py-2 bg-white border shadow-sm border-slate-300 rounded-l-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(shareUrl);
                        toast.success('Link copied to clipboard');
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-r-md hover:bg-indigo-700 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                
                <div className="bg-indigo-50 p-4 rounded-md">
                  <h3 className="text-sm font-medium text-indigo-800 mb-2">Sharing Tips</h3>
                  <ul className="text-sm text-indigo-700 space-y-1 list-disc pl-5">
                    <li>Share on social media to reach a wider audience</li>
                    <li>Email the link to close family and friends</li>
                    <li>Include the link in funeral or memorial service programs</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default ShareMemorialModal;