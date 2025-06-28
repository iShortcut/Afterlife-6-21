import { useState, useEffect } from 'react';
import { UserPlus, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface JoinRequestButtonProps {
  groupId: string;
  groupName: string;
  className?: string;
}

type RequestStatus = 'none' | 'pending' | 'approved' | 'rejected';

const JoinRequestButton = ({ groupId, groupName, className = '' }: JoinRequestButtonProps) => {
  const { user } = useAuth();
  const [requestStatus, setRequestStatus] = useState<RequestStatus>('none');
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    const checkRequestStatus = async () => {
      if (!user) {
        setCheckingStatus(false);
        return;
      }

      try {
        setCheckingStatus(true);
        
        // Check if user already has a join request
        const { data, error } = await supabase
          .from('group_join_requests')
          .select('status')
          .eq('group_id', groupId)
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (error) throw error;
        
        if (data) {
          setRequestStatus(data.status as RequestStatus);
        } else {
          setRequestStatus('none');
        }
      } catch (err) {
        console.error('Error checking join request status:', err);
        toast.error('Failed to check join request status');
      } finally {
        setCheckingStatus(false);
      }
    };

    checkRequestStatus();
  }, [groupId, user]);

  const handleRequestJoin = async () => {
    if (!user) {
      toast.error('Please sign in to request to join this group');
      return;
    }

    try {
      setLoading(true);
      
      // Create join request
      const { error } = await supabase
        .from('group_join_requests')
        .insert({
          group_id: groupId,
          user_id: user.id,
          status: 'pending',
          requested_at: new Date().toISOString()
        });
        
      if (error) throw error;
      
      // Notify group admins
      const { data: admins, error: adminsError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .eq('role', 'admin');
        
      if (adminsError) throw adminsError;
      
      if (admins && admins.length > 0) {
        const notifications = admins.map(admin => ({
          recipient_id: admin.user_id,
          sender_id: user.id,
          type: 'GROUP_JOIN_REQUEST',
          entity_type: 'GROUP',
          entity_id: groupId,
          message: `${user.user_metadata?.full_name || 'Someone'} has requested to join the group "${groupName}"`,
          metadata: {
            group_id: groupId,
            group_name: groupName,
            requester_id: user.id
          }
        }));
        
        const { error: notifyError } = await supabase
          .from('notifications')
          .insert(notifications);
          
        if (notifyError) console.error('Error sending notifications:', notifyError);
      }
      
      setRequestStatus('pending');
      toast.success('Join request sent successfully');
    } catch (err) {
      console.error('Error sending join request:', err);
      toast.error('Failed to send join request');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawRequest = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Delete join request
      const { error } = await supabase
        .from('group_join_requests')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      setRequestStatus('none');
      toast.success('Join request withdrawn');
    } catch (err) {
      console.error('Error withdrawing join request:', err);
      toast.error('Failed to withdraw join request');
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <Button
        disabled
        className={`flex items-center gap-2 ${className}`}
      >
        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
        <span>Checking...</span>
      </Button>
    );
  }

  if (requestStatus === 'pending') {
    return (
      <div className={`flex flex-col sm:flex-row items-center gap-2 ${className}`}>
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-md text-sm">
          Your request to join is pending approval
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleWithdrawRequest}
          isLoading={loading}
          className="flex items-center gap-2 text-rose-600 border-rose-200 hover:bg-rose-50"
        >
          <X size={16} />
          <span>Withdraw Request</span>
        </Button>
      </div>
    );
  }

  if (requestStatus === 'rejected') {
    return (
      <div className={`bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-md text-sm ${className}`}>
        Your request to join was declined
      </div>
    );
  }

  if (requestStatus === 'approved') {
    return (
      <div className={`bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-md text-sm ${className}`}>
        Your request to join was approved
      </div>
    );
  }

  return (
    <Button
      onClick={handleRequestJoin}
      isLoading={loading}
      className={`flex items-center gap-2 ${className}`}
    >
      <UserPlus size={16} />
      <span>Request to Join Group</span>
    </Button>
  );
};

export default JoinRequestButton;