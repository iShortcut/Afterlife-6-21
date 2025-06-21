import { useState, useEffect } from 'react';
import { UserPlus, UserCheck, UserX, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';

interface AddFriendButtonProps {
  profileUserId: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'button' | 'text';
  className?: string;
}

type ConnectionStatus = 'none' | 'pending' | 'accepted' | 'blocked';

const AddFriendButton = ({
  profileUserId,
  size = 'sm',
  variant = 'button',
  className = ''
}: AddFriendButtonProps) => {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('none');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkConnectionStatus = async () => {
      if (!user || user.id === profileUserId) return;

      try {
        const { data, error } = await supabase
          .from('user_connections')
          .select('status')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .or(`user1_id.eq.${profileUserId},user2_id.eq.${profileUserId}`)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        setConnectionStatus(data?.status?.toLowerCase() as ConnectionStatus || 'none');
      } catch (err) {
        console.error('Error checking connection status:', err);
        setError('Failed to check connection status');
      }
    };

    checkConnectionStatus();

    // Subscribe to changes
    const channel = supabase
      .channel('connection-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_connections',
          filter: `or(user1_id.eq.${user?.id},user2_id.eq.${user?.id})`
        },
        () => {
          checkConnectionStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profileUserId]);

  const handleAddFriend = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Ensure user1_id is the lower UUID for consistency
      const [user1_id, user2_id] = [user.id, profileUserId].sort();

      const { error } = await supabase
        .from('user_connections')
        .insert({
          user1_id,
          user2_id,
          status: 'PENDING'
        });

      if (error) throw error;

      setConnectionStatus('pending');
    } catch (err) {
      console.error('Error sending friend request:', err);
      setError('Failed to send friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('user_connections')
        .delete()
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .or(`user1_id.eq.${profileUserId},user2_id.eq.${profileUserId}`);

      if (error) throw error;

      setConnectionStatus('none');
    } catch (err) {
      console.error('Error canceling friend request:', err);
      setError('Failed to cancel friend request');
    } finally {
      setLoading(false);
    }
  };

  // Don't render anything if viewing own profile
  if (!user || user.id === profileUserId) return null;

  if (variant === 'text') {
    switch (connectionStatus) {
      case 'none':
        return (
          <button
            onClick={handleAddFriend}
            disabled={loading}
            className={`text-indigo-600 hover:text-indigo-800 flex items-center gap-1 ${className}`}
          >
            <UserPlus size={16} />
            <span>Add Friend</span>
          </button>
        );
      case 'pending':
        return (
          <button
            onClick={handleCancelRequest}
            disabled={loading}
            className={`text-amber-600 hover:text-amber-800 flex items-center gap-1 ${className}`}
          >
            <Clock size={16} />
            <span>Request Pending</span>
          </button>
        );
      case 'accepted':
        return (
          <div className={`text-emerald-600 flex items-center gap-1 ${className}`}>
            <UserCheck size={16} />
            <span>Friends</span>
          </div>
        );
      case 'blocked':
        return (
          <div className={`text-rose-600 flex items-center gap-1 ${className}`}>
            <UserX size={16} />
            <span>Blocked</span>
          </div>
        );
      default:
        return null;
    }
  }

  switch (connectionStatus) {
    case 'none':
      return (
        <Button
          onClick={handleAddFriend}
          disabled={loading}
          size={size}
          className={`flex items-center gap-2 ${className}`}
        >
          <UserPlus size={16} />
          <span>Add Friend</span>
        </Button>
      );
    case 'pending':
      return (
        <Button
          onClick={handleCancelRequest}
          variant="outline"
          size={size}
          className={`flex items-center gap-2 text-amber-600 ${className}`}
          disabled={loading}
        >
          <Clock size={16} />
          <span>Request Pending</span>
        </Button>
      );
    case 'accepted':
      return (
        <Button
          variant="outline"
          size={size}
          className={`flex items-center gap-2 text-emerald-600 cursor-default ${className}`}
          disabled
        >
          <UserCheck size={16} />
          <span>Friends</span>
        </Button>
      );
    case 'blocked':
      return (
        <Button
          variant="outline"
          size={size}
          className={`flex items-center gap-2 text-rose-600 cursor-default ${className}`}
          disabled
        >
          <UserX size={16} />
          <span>Blocked</span>
        </Button>
      );
    default:
      return null;
  }
};

export default AddFriendButton;