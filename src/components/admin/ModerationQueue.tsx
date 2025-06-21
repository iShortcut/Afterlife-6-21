import { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, Trash2, Eye, AlertTriangle, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface Report {
  id: string;
  content_type: 'POST' | 'COMMENT' | 'TRIBUTE' | 'MEMORIAL' | 'PROFILE';
  content_id: string;
  reason: string;
  details: string | null;
  status: 'PENDING' | 'REVIEWED_ACCEPTED' | 'REVIEWED_REJECTED' | 'ACTION_TAKEN';
  created_at: string;
  reporter: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  reported_user: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

const REPORTS_PER_PAGE = 10;

const ModerationQueue = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [processingReportId, setProcessingReportId] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, count, error: reportError } = await supabase
        .from('moderation_reports')
        .select(`
          *,
          reporter:reporter_id (
            id,
            full_name,
            username,
            avatar_url
          ),
          reported_user:reported_user_id (
            id,
            full_name,
            username,
            avatar_url
          )
        `, { count: 'exact' })
        .eq('status', 'PENDING')
        .order('created_at', { ascending: true })
        .range(page * REPORTS_PER_PAGE, (page + 1) * REPORTS_PER_PAGE - 1);

      if (reportError) throw reportError;

      setReports(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to load moderation queue');
      toast.error('Failed to load moderation queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [page]);

  const handleAction = async (reportId: string, action: 'accept' | 'reject' | 'delete') => {
    try {
      setProcessingReportId(reportId);

      if (action === 'delete') {
        // Call edge function to delete content and update report
        const { error: deleteError } = await supabase.functions.invoke('moderateAndDeleteContent', {
          body: { reportId }
        });

        if (deleteError) throw deleteError;

        toast.success('Content deleted and report updated');
      } else {
        // Update report status
        const { error: updateError } = await supabase
          .from('moderation_reports')
          .update({
            status: action === 'accept' ? 'REVIEWED_ACCEPTED' : 'REVIEWED_REJECTED',
            reviewed_by: (await supabase.auth.getUser()).data.user?.id,
            reviewed_at: new Date().toISOString()
          })
          .eq('id', reportId);

        if (updateError) throw updateError;

        toast.success(`Report marked as ${action === 'accept' ? 'accepted' : 'rejected'}`);
      }

      // Refresh reports
      fetchReports();
    } catch (err) {
      console.error('Error handling moderation action:', err);
      toast.error('Failed to process moderation action');
    } finally {
      setProcessingReportId(null);
    }
  };

  const getContentUrl = (report: Report) => {
    switch (report.content_type) {
      case 'POST':
        return `/posts/${report.content_id}`;
      case 'COMMENT':
        return `/posts/${report.content_id}`;
      case 'TRIBUTE':
        return `/memorials/${report.content_id}`;
      case 'MEMORIAL':
        return `/memorials/${report.content_id}`;
      case 'PROFILE':
        return `/profile/${report.content_id}`;
      default:
        return '#';
    }
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'SPAM':
        return 'Spam';
      case 'HARASSMENT':
        return 'Harassment';
      case 'INAPPROPRIATE':
        return 'Inappropriate Content';
      case 'HATE_SPEECH':
        return 'Hate Speech';
      case 'MISINFORMATION':
        return 'Misinformation';
      case 'OTHER':
        return 'Other';
      default:
        return reason;
    }
  };

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-medium text-slate-800 mb-2">Moderation Queue</h2>
        <p className="text-slate-600">Review and take action on reported content</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-300 border-t-indigo-600 mb-4"></div>
            <p className="text-slate-500">Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center">
            <Shield className="mx-auto h-12 w-12 text-slate-300 mb-2" />
            <p className="text-slate-600">No pending reports to review</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {reports.map(report => (
              <div key={report.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                        {report.content_type}
                      </span>
                      <span className="text-sm text-slate-500">
                        {new Date(report.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-800">
                          Reported by:
                        </h3>
                        <div className="flex items-center gap-2">
                          {report.reporter?.avatar_url ? (
                            <img
                              src={report.reporter.avatar_url}
                              alt={report.reporter.full_name || 'Reporter'}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                              <User size={12} className="text-slate-500" />
                            </div>
                          )}
                          <span>
                            {report.reporter?.full_name || report.reporter?.username || 'Anonymous'}
                          </span>
                        </div>
                      </div>
                      
                      {report.reported_user && (
                        <div className="flex items-center gap-2 mt-1">
                          <h3 className="font-medium text-slate-800">
                            Content by:
                          </h3>
                          <div className="flex items-center gap-2">
                            {report.reported_user.avatar_url ? (
                              <img
                                src={report.reported_user.avatar_url}
                                alt={report.reported_user.full_name || 'Reported User'}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                                <User size={12} className="text-slate-500" />
                              </div>
                            )}
                            <span>
                              {report.reported_user.full_name || report.reported_user.username || 'Anonymous'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mb-4">
                      <div className="text-sm font-medium text-slate-700">
                        Reason: {getReasonLabel(report.reason)}
                      </div>
                      {report.details && (
                        <p className="mt-1 text-sm text-slate-600">
                          {report.details}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(getContentUrl(report), '_blank')}
                      className="flex items-center gap-1"
                    >
                      <Eye size={16} />
                      <span>View</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction(report.id, 'accept')}
                      isLoading={processingReportId === report.id}
                      className="flex items-center gap-1 text-emerald-600"
                    >
                      <CheckCircle size={16} />
                      <span>Accept</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction(report.id, 'reject')}
                      isLoading={processingReportId === report.id}
                      className="flex items-center gap-1 text-amber-600"
                    >
                      <XCircle size={16} />
                      <span>Reject</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction(report.id, 'delete')}
                      isLoading={processingReportId === report.id}
                      className="flex items-center gap-1 text-rose-600"
                    >
                      <Trash2 size={16} />
                      <span>Delete</span>
                    </Button>
                  </div>
                </div>

                {/* Content Preview */}
                <div className="mt-4 p-3 bg-slate-50 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} className="text-amber-500" />
                    <span className="text-sm font-medium text-slate-700">Reported Content</span>
                  </div>
                  <p className="text-sm text-slate-600 italic">
                    Content preview not available. Click "View" to see the reported content.
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalCount > REPORTS_PER_PAGE && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Showing {page * REPORTS_PER_PAGE + 1} to{' '}
              {Math.min((page + 1) * REPORTS_PER_PAGE, totalCount)} of {totalCount} reports
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
                disabled={(page + 1) * REPORTS_PER_PAGE >= totalCount}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModerationQueue;