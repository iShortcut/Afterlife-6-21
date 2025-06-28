import { useState, useEffect } from 'react';
import { Check, X, User, Calendar, Filter, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import toast from 'react-hot-toast';

interface JoinRequestsManagerProps {
  groupId: string;
  groupName: string;
  className?: string;
}

interface JoinRequest {
  id: string;
  user_id: string;
  group_id: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  user?: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

const JoinRequestsManager = ({ groupId, groupName, className = '' }: JoinRequestsManagerProps) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [showRejectionInput, setShowRejectionInput] = useState<string | null>(null);

  const fetchJoinRequests = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      let query = supabase
        .from('group_join_requests')
        .select(`
          *,
          user:user_id (
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('group_id', groupId);
        
      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      // Apply search filter if provided
      if (searchQuery) {
        query = query.or(`user.full_name.ilike.%${searchQuery}%,user.username.ilike.%${searchQuery}%`);
      }
      
      const { data, error } = await query.order('requested_at', { ascending: false });
        
      if (error) throw error;
      
      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching join requests:', err);
      toast.error('Failed to load join requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJoinRequests();
    
    // Subscribe to changes
    const channel = supabase
      .channel(`group-${groupId}-join-requests`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_join_requests',
          filter: `group_id=eq.${groupId}`
        },
        () => {
          fetchJoinRequests();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, user, statusFilter, searchQuery]);

  const handleApproveRequest = async (requestId: string, userId: string) => {
    if (!user) return;

    try {
      setProcessingId(requestId);
      
      // Update request status
      const { error: updateError } = await supabase
        .from('group_join_requests')
        .update({ status: 'approved' })
        .eq('id', requestId);
        
      if (updateError) throw updateError;
      
      // Add user to group members
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: userId,
          role: 'member',
          status: 'JOINED'
        });
        
      if (memberError) throw memberError;
      
      // Send notification to user
      const { error: notifyError } = await supabase
        .from('notifications')
        .insert({
          recipient_id: userId,
          sender_id: user.id,
          type: 'GROUP_JOIN_APPROVED',
          entity_type: 'GROUP',
          entity_id: groupId,
          message: `Your request to join the group "${groupName}" has been approved`,
          metadata: {
            group_id: groupId,
            group_name: groupName
          }
        });
        
      if (notifyError) console.error('Error sending notification:', notifyError);
      
      // Update local state
      setRequests(prev => 
        prev.map(req => 
          req.id === requestId ? { ...req, status: 'approved' } : req
        )
      );
      
      toast.success('Request approved');
    } catch (err) {
      console.error('Error approving request:', err);
      toast.error('Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (requestId: string, userId: string) => {
    if (!user) return;

    try {
      setProcessingId(requestId);
      
      // Update request status
      const { error: updateError } = await supabase
        .from('group_join_requests')
        .update({ 
          status: 'rejected',
          rejection_reason: rejectionReason || null
        })
        .eq('id', requestId);
        
      if (updateError) throw updateError;
      
      // Send notification to user
      const { error: notifyError } = await supabase
        .from('notifications')
        .insert({
          recipient_id: userId,
          sender_id: user.id,
          type: 'GROUP_JOIN_REJECTED',
          entity_type: 'GROUP',
          entity_id: groupId,
          message: `Your request to join the group "${groupName}" has been declined`,
          metadata: {
            group_id: groupId,
            group_name: groupName,
            reason: rejectionReason || null
          }
        });
        
      if (notifyError) console.error('Error sending notification:', notifyError);
      
      // Update local state
      setRequests(prev => 
        prev.map(req => 
          req.id === requestId ? { ...req, status: 'rejected' } : req
        )
      );
      
      setShowRejectionInput(null);
      setRejectionReason('');
      toast.success('Request rejected');
    } catch (err) {
      console.error('Error rejecting request:', err);
      toast.error('Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkApprove = async () => {
    if (!user) return;
    
    const pendingRequests = requests.filter(req => req.status === 'pending');
    if (pendingRequests.length === 0) return;
    
    try {
      setLoading(true);
      
      // Update all pending requests
      const { error: updateError } = await supabase
        .from('group_join_requests')
        .update({ status: 'approved' })
        .eq('group_id', groupId)
        .eq('status', 'pending');
        
      if (updateError) throw updateError;
      
      // Add all users to group members
      const membersToAdd = pendingRequests.map(req => ({
        group_id: groupId,
        user_id: req.user_id,
        role: 'member',
        status: 'JOINED'
      }));
      
      const { error: memberError } = await supabase
        .from('group_members')
        .insert(membersToAdd);
        
      if (memberError) throw memberError;
      
      // Send notifications to all users
      const notifications = pendingRequests.map(req => ({
        recipient_id: req.user_id,
        sender_id: user.id,
        type: 'GROUP_JOIN_APPROVED',
        entity_type: 'GROUP',
        entity_id: groupId,
        message: `Your request to join the group "${groupName}" has been approved`,
        metadata: {
          group_id: groupId,
          group_name: groupName
        }
      }));
      
      const { error: notifyError } = await supabase
        .from('notifications')
        .insert(notifications);
        
      if (notifyError) console.error('Error sending notifications:', notifyError);
      
      // Update local state
      setRequests(prev => 
        prev.map(req => 
          req.status === 'pending' ? { ...req, status: 'approved' } : req
        )
      );
      
      toast.success(`Approved ${pendingRequests.length} requests`);
    } catch (err) {
      console.error('Error bulk approving requests:', err);
      toast.error('Failed to approve requests');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
      <h3 className="text-lg font-medium text-slate-800 mb-4">Join Requests</h3>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-grow">
          <Input
            placeholder="Search by name or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search size={18} className="text-slate-400" />}
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-white border shadow-sm border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('pending');
            }}
            className="flex items-center gap-1.5"
          >
            <Filter size={16} />
            <span>Reset</span>
          </Button>
        </div>
      </div>
      
      {statusFilter === 'pending' && (
        <div className="mb-4 flex justify-between items-center">
          <div className="text-sm text-slate-500">
            {requests.filter(r => r.status === 'pending').length} pending requests
          </div>
          
          {requests.filter(r => r.status === 'pending').length > 0 && (
            <Button
              size="sm"
              onClick={handleBulkApprove}
              disabled={loading}
              className="flex items-center gap-1.5"
            >
              <Check size={16} />
              <span>Approve All</span>
            </Button>
          )}
        </div>
      )}
      
      {loading && requests.length === 0 ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center justify-between p-4 bg-slate-50 rounded-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 rounded-full" />
                <div>
                  <div className="h-4 bg-slate-200 rounded w-24 mb-2" />
                  <div className="h-3 bg-slate-200 rounded w-16" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-20 bg-slate-200 rounded" />
                <div className="h-8 w-20 bg-slate-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-md">
          <User className="mx-auto h-12 w-12 text-slate-300 mb-2" />
          <p className="text-slate-600">No join requests found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(request => (
            <div 
              key={request.id} 
              className={`p-4 rounded-md ${
                request.status === 'pending' 
                  ? 'bg-white border border-slate-200' 
                  : request.status === 'approved'
                    ? 'bg-emerald-50 border border-emerald-100'
                    : 'bg-rose-50 border border-rose-100'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {request.user?.avatar_url ? (
                    <img 
                      src={request.user.avatar_url} 
                      alt={request.user.full_name || 'User'} 
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <User size={20} className="text-indigo-500" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-slate-800">
                      {request.user?.full_name || request.user?.username || 'Anonymous'}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar size={12} />
                      <span>
                        Requested {new Date(request.requested_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                {request.status === 'pending' ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowRejectionInput(request.id)}
                      isLoading={processingId === request.id}
                      className="flex items-center gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50"
                    >
                      <X size={16} />
                      <span>Reject</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApproveRequest(request.id, request.user_id)}
                      isLoading={processingId === request.id}
                      className="flex items-center gap-1.5"
                    >
                      <Check size={16} />
                      <span>Approve</span>
                    </Button>
                  </div>
                ) : (
                  <div className={`text-sm font-medium ${
                    request.status === 'approved' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {request.status === 'approved' ? 'Approved' : 'Rejected'}
                  </div>
                )}
              </div>
              
              {showRejectionInput === request.id && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <Input
                    placeholder="Reason for rejection (optional)"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="mb-2"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowRejectionInput(null);
                        setRejectionReason('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleRejectRequest(request.id, request.user_id)}
                      isLoading={processingId === request.id}
                      className="flex items-center gap-1.5"
                    >
                      Confirm Rejection
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JoinRequestsManager;