import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Search, Filter, Calendar, CheckCircle, XCircle, Clock, User } from 'lucide-react';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

interface Feedback {
  id: string;
  user_id: string | null;
  feedback_type: 'bug' | 'feature' | 'improvement' | 'other';
  message: string;
  context: string;
  screenshot_url: string | null;
  browser_info: string | null;
  status: 'new' | 'in_progress' | 'resolved' | 'rejected';
  created_at: string;
  resolved_at: string | null;
  user?: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

const ITEMS_PER_PAGE = 10;

const FeedbackListPage = () => {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('user_feedback')
        .select(`
          *,
          user:user_id (
            id,
            full_name,
            username,
            avatar_url
          )
        `, { count: 'exact' });

      // Apply search filter if provided
      if (searchQuery) {
        query = query.or(`message.ilike.%${searchQuery}%,context.ilike.%${searchQuery}%`);
      }

      // Apply status filter if provided
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      // Apply type filter if provided
      if (typeFilter) {
        query = query.eq('feedback_type', typeFilter);
      }

      // Apply pagination
      const { data, count, error: fetchError } = await query
        .order('created_at', { ascending: false })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

      if (fetchError) throw fetchError;

      setFeedback(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching feedback:', err);
      setError('Failed to load feedback');
      toast.error('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [page, searchQuery, statusFilter, typeFilter]);

  const handleStatusChange = async (feedbackId: string, newStatus: 'in_progress' | 'resolved' | 'rejected') => {
    try {
      setProcessingId(feedbackId);

      const updateData: any = {
        status: newStatus
      };

      if (newStatus === 'resolved' || newStatus === 'rejected') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user?.id;
      }

      if (newStatus === 'resolved' && resolutionNotes) {
        updateData.resolution_notes = resolutionNotes;
      }

      const { error: updateError } = await supabase
        .from('user_feedback')
        .update(updateData)
        .eq('id', feedbackId);

      if (updateError) throw updateError;

      // Update local state
      setFeedback(prev => 
        prev.map(item => 
          item.id === feedbackId ? { ...item, status: newStatus } : item
        )
      );

      toast.success(`Feedback marked as ${newStatus.replace('_', ' ')}`);
      setSelectedFeedback(null);
      setResolutionNotes('');
    } catch (err) {
      console.error('Error updating feedback status:', err);
      toast.error('Failed to update feedback status');
    } finally {
      setProcessingId(null);
    }
  };

  const getFeedbackTypeLabel = (type: string) => {
    switch (type) {
      case 'bug': return 'Bug';
      case 'feature': return 'Feature Request';
      case 'improvement': return 'Improvement';
      case 'other': return 'Other';
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">New</span>;
      case 'in_progress':
        return <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">In Progress</span>;
      case 'resolved':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Resolved</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-medium">Rejected</span>;
      default:
        return <span className="px-2 py-1 bg-slate-100 text-slate-800 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-medium text-slate-800 mb-2">User Feedback</h2>
        <p className="text-slate-600">Manage and respond to user feedback and bug reports</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        {/* Search and Filter Bar */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-grow">
              <Input
                placeholder="Search feedback..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(0); // Reset to first page on new search
                }}
                icon={<Search size={18} className="text-slate-400" />}
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(0); // Reset to first page on filter change
                }}
                className="px-3 py-2 bg-white border shadow-sm border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">All Statuses</option>
                <option value="new">New</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </select>
              
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(0); // Reset to first page on filter change
                }}
                className="px-3 py-2 bg-white border shadow-sm border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">All Types</option>
                <option value="bug">Bug</option>
                <option value="feature">Feature Request</option>
                <option value="improvement">Improvement</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-md m-4">
            {error}
          </div>
        )}

        {/* Feedback Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Message</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-40" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                    <td className="px-4 py-3 text-right"><div className="h-8 bg-slate-200 rounded w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : feedback.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No feedback found
                  </td>
                </tr>
              ) : (
                feedback.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        {getFeedbackTypeLabel(item.feedback_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-xs truncate" title={item.message}>
                        {item.message}
                      </div>
                      <div className="text-xs text-slate-500 truncate" title={item.context}>
                        {item.context}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {item.user ? (
                        <div className="flex items-center gap-2">
                          {item.user.avatar_url ? (
                            <img 
                              src={item.user.avatar_url} 
                              alt={item.user.full_name || 'User'} 
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                              <User size={12} className="text-slate-500" />
                            </div>
                          )}
                          <span className="text-sm">
                            {item.user.full_name || item.user.username || 'Anonymous'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-500">Anonymous</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {item.status === 'new' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(item.id, 'in_progress')}
                              isLoading={processingId === item.id}
                              className="flex items-center gap-1 text-amber-600"
                            >
                              <Clock size={14} />
                              <span>Start</span>
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedFeedback(item);
                                setResolutionNotes('');
                              }}
                              className="flex items-center gap-1"
                            >
                              <CheckCircle size={14} />
                              <span>Resolve</span>
                            </Button>
                          </>
                        )}
                        {item.status === 'in_progress' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedFeedback(item);
                              setResolutionNotes('');
                            }}
                            className="flex items-center gap-1"
                          >
                            <CheckCircle size={14} />
                            <span>Resolve</span>
                          </Button>
                        )}
                        {(item.status === 'new' || item.status === 'in_progress') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(item.id, 'rejected')}
                            isLoading={processingId === item.id}
                            className="flex items-center gap-1 text-rose-600"
                          >
                            <XCircle size={14} />
                            <span>Reject</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalCount > ITEMS_PER_PAGE && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Showing {page * ITEMS_PER_PAGE + 1} to{' '}
              {Math.min((page + 1) * ITEMS_PER_PAGE, totalCount)} of {totalCount} items
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * ITEMS_PER_PAGE >= totalCount}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Resolution Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-slate-800 mb-4">
              Resolve Feedback
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Resolution Notes (Optional)
              </label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md"
                rows={4}
                placeholder="Add notes about how this feedback was resolved..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedFeedback(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleStatusChange(selectedFeedback.id, 'resolved')}
                isLoading={processingId === selectedFeedback.id}
              >
                Resolve Feedback
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackListPage;