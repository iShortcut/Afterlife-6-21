import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Ban, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

interface BlockedUser {
  id: string;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
}

const BlockedUsers = () => {
  const { user } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBlockedUsers = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_blocks')
        .select(`
          blocked_user:blocked_user_id (
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('blocker_user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setBlockedUsers(data?.map(item => item.blocked_user) || []);
    } catch (err) {
      console.error('Error fetching blocked users:', err);
      setError('Failed to load blocked users');
      toast.error('Failed to load blocked users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockedUsers();
  }, [user]);

  const handleUnblock = async (blockedUserId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_user_id', user.id)
        .eq('blocked_user_id', blockedUserId);

      if (error) throw error;

      setBlockedUsers(prev => prev.filter(u => u.id !== blockedUserId));
      toast.success('User unblocked');
    } catch (err) {
      console.error('Error unblocking user:', err);
      toast.error('Failed to unblock user');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white p-4 rounded-lg flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-200 rounded-full" />
                <div className="flex-grow">
                  <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-slate-200 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        className="max-w-2xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-serif text-slate-800 mb-2">
            Blocked Users
          </h1>
          <p className="text-slate-600">
            Manage the list of users you've blocked.
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {blockedUsers.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <Ban className="mx-auto h-12 w-12 text-slate-300 mb-2" />
              <p className="text-slate-600">You haven't blocked any users</p>
            </div>
          ) : (
            blockedUsers.map(blockedUser => (
              <div
                key={blockedUser.id}
                className="bg-white rounded-lg shadow-sm p-4 flex items-center gap-4"
              >
                <div className="flex-shrink-0">
                  {blockedUser.avatar_url ? (
                    <img
                      src={blockedUser.avatar_url}
                      alt={blockedUser.full_name || 'User'}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                      <User size={24} className="text-indigo-500" />
                    </div>
                  )}
                </div>

                <div className="flex-grow">
                  <h3 className="font-medium text-slate-800">
                    {blockedUser.full_name || blockedUser.username || 'Anonymous'}
                  </h3>
                  {blockedUser.username && (
                    <p className="text-sm text-slate-500">
                      @{blockedUser.username}
                    </p>
                  )}
                </div>

                <Button
                  onClick={() => handleUnblock(blockedUser.id)}
                  variant="danger"
                  size="sm"
                >
                  Unblock
                </Button>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default BlockedUsers;