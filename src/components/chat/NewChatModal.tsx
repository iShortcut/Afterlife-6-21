import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Search, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Input from '../ui/Input';
import Button from '../ui/Button';

interface NewChatModalProps {
  onClose: () => void;
  onThreadCreated: (threadId: string) => void;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

const NewChatModal = ({ onClose, onThreadCreated }: NewChatModalProps) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [recentContacts, setRecentContacts] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentContacts = async () => {
      if (!user) return;

      try {
        setLoading(true);
        
        // Get recent chat participants
        const { data: participantsData, error: participantsError } = await supabase
          .from('chat_participants')
          .select(`
            thread_id,
            user_id
          `)
          .eq('user_id', user.id)
          .order('last_read_at', { ascending: false })
          .limit(5);
          
        if (participantsError) throw participantsError;
        
        // Get thread IDs
        const threadIds = participantsData?.map(p => p.thread_id) || [];
        
        if (threadIds.length === 0) {
          setRecentContacts([]);
          return;
        }
        
        // Get other participants from these threads
        const { data: otherParticipantsData, error: otherParticipantsError } = await supabase
          .from('chat_participants')
          .select(`
            user_id
          `)
          .in('thread_id', threadIds)
          .neq('user_id', user.id);
          
        if (otherParticipantsError) throw otherParticipantsError;
        
        // Get unique user IDs
        const uniqueUserIds = [...new Set(otherParticipantsData?.map(p => p.user_id) || [])];
        
        if (uniqueUserIds.length === 0) {
          setRecentContacts([]);
          return;
        }
        
        // Get user profiles
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', uniqueUserIds)
          .limit(5);
          
        if (profilesError) throw profilesError;
        
        setRecentContacts(profilesData || []);
      } catch (err) {
        console.error('Error fetching recent contacts:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecentContacts();
  }, [user]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: searchError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
        .neq('id', user.id)
        .limit(10);
        
      if (searchError) throw searchError;
      
      setSearchResults(data || []);
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const createOrGetThread = async (otherUserId: string) => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Check if a thread already exists between these users
      const { data: existingThreads, error: existingThreadsError } = await supabase
        .from('chat_threads')
        .select(`
          id,
          participants:chat_participants(user_id)
        `)
        .eq('is_group', false);
        
      if (existingThreadsError) throw existingThreadsError;
      
      // Find a thread where both users are participants
      const existingThread = existingThreads?.find(thread => {
        const participantIds = thread.participants.map((p: any) => p.user_id);
        return participantIds.includes(user.id) && participantIds.includes(otherUserId);
      });
      
      if (existingThread) {
        // Thread exists, return its ID
        onThreadCreated(existingThread.id);
        return;
      }
      
      // Create a new thread
      const { data: newThread, error: newThreadError } = await supabase
        .from('chat_threads')
        .insert({
          is_group: false
        })
        .select()
        .single();
        
      if (newThreadError) throw newThreadError;
      
      // Add participants
      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert([
          {
            thread_id: newThread.id,
            user_id: user.id
          },
          {
            thread_id: newThread.id,
            user_id: otherUserId
          }
        ]);
        
      if (participantsError) throw participantsError;
      
      onThreadCreated(newThread.id);
    } catch (err) {
      console.error('Error creating chat thread:', err);
      setError('Failed to start conversation');
    } finally {
      setLoading(false);
    }
  };

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
            <h2 className="text-lg font-medium text-slate-800">New Message</h2>
            <button
              onClick={onClose}
              className="p-1 text-slate-500 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-4">
            <div className="mb-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search for a user..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-grow"
                />
                <Button
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || loading}
                  isLoading={loading}
                >
                  <Search size={18} />
                </Button>
              </div>
              
              {error && (
                <p className="mt-2 text-sm text-rose-600">{error}</p>
              )}
            </div>

            {searchQuery && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-700 mb-2">Search Results</h3>
                
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse flex items-center gap-3 p-2">
                        <div className="w-10 h-10 bg-slate-200 rounded-full" />
                        <div className="flex-grow">
                          <div className="h-4 bg-slate-200 rounded w-1/3 mb-1" />
                          <div className="h-3 bg-slate-200 rounded w-1/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="text-sm text-slate-500 p-2">No users found</p>
                ) : (
                  <div className="space-y-1">
                    {searchResults.map(profile => (
                      <div
                        key={profile.id}
                        onClick={() => createOrGetThread(profile.id)}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-50 cursor-pointer"
                      >
                        {profile.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={profile.full_name || 'User'}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <User size={20} className="text-indigo-500" />
                          </div>
                        )}
                        
                        <div>
                          <h4 className="font-medium text-slate-800">
                            {profile.full_name || profile.username || 'Unknown User'}
                          </h4>
                          {profile.username && (
                            <p className="text-sm text-slate-500">@{profile.username}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {recentContacts.length > 0 && !searchQuery && (
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-2">Recent Contacts</h3>
                <div className="space-y-1">
                  {recentContacts.map(profile => (
                    <div
                      key={profile.id}
                      onClick={() => createOrGetThread(profile.id)}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-50 cursor-pointer"
                    >
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.full_name || 'User'}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <User size={20} className="text-indigo-500" />
                        </div>
                      )}
                      
                      <div>
                        <h4 className="font-medium text-slate-800">
                          {profile.full_name || profile.username || 'Unknown User'}
                        </h4>
                        {profile.username && (
                          <p className="text-sm text-slate-500">@{profile.username}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default NewChatModal;