import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface FollowButtonProps {
  memorialId: string;
  className?: string;
}

const FollowButton = ({ memorialId, className = '' }: FollowButtonProps) => {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('memorial_followers')
          .select('memorial_id')
          .eq('memorial_id', memorialId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        setIsFollowing(!!data);
      } catch (err) {
        console.error('Error checking follow status:', err);
        toast.error('Failed to check follow status');
      } finally {
        setLoading(false);
      }
    };

    checkFollowStatus();
  }, [memorialId, user]);

  const handleFollow = async () => {
    if (!user) {
      toast.error('Please sign in to follow memorials');
      return;
    }

    try {
      setLoading(true);

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('memorial_followers')
          .delete()
          .eq('memorial_id', memorialId)
          .eq('user_id', user.id);

        if (error) throw error;
        setIsFollowing(false);
        toast.success('Memorial unfollowed');
      } else {
        // Follow
        const { error } = await supabase
          .from('memorial_followers')
          .insert({
            memorial_id: memorialId,
            user_id: user.id
          });

        if (error) throw error;
        setIsFollowing(true);
        toast.success('Memorial followed');
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
      toast.error('Failed to update follow status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleFollow}
      variant={isFollowing ? 'primary' : 'outline'}
      disabled={loading || !user}
      className={`flex items-center gap-2 ${className}`}
    >
      <Heart
        size={18}
        className={isFollowing ? 'fill-current' : 'fill-none'}
      />
      <span>{isFollowing ? 'Following' : 'Follow'}</span>
    </Button>
  );
};

export default FollowButton;