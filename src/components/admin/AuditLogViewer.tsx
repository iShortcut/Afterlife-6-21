import { useState, useEffect } from 'react';
import { Search, Calendar, Filter, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Input from '../ui/Input';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  performed_by: string;
  target_type: string;
  target_id: string;
  metadata: Record<string, any>;
  user: {
    id: string;
    full_name: string | null;
    username: string | null;
  } | null;
}

const LOGS_PER_PAGE = 20;

const AuditLogViewer = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filters
  const [filters, setFilters] = useState({
    action: '',
    userId: '',
    startDate: '',
    endDate: '',
  });

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          user:performed_by (
            id,
            full_name,
            username
          )
        `, { count: 'exact' });

      // Apply filters
      if (filters.action) {
        query = query.eq('action', filters.action);
      }
      if (filters.userId) {
        query = query.eq('performed_by', filters.userId);
      }
      if (filters.startDate) {
        query = query.gte('timestamp', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('timestamp', filters.endDate);
      }

      const { data, count, error } = await query
        .order('timestamp', { ascending: false })
        .range(page * LOGS_PER_PAGE, (page + 1) * LOGS_PER_PAGE - 1);

      if (error) throw error;

      setLogs(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError('Failed to load audit logs');
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      userId: '',
      startDate: '',
      endDate: '',
    });
    setPage(0);
  };

  const formatMetadata = (metadata: Record<string, any>) => {
    return Object.entries(metadata)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join('\n');
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
        <h2 className="text-xl font-medium text-slate-800 mb-2">Audit Log</h2>
        <p className="text-slate-600">View system activity and moderation actions</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="p-4 border-b border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Filter by action..."
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              icon={<Filter className="text-slate-400" size={18} />}
            />
            
            <Input
              placeholder="Filter by user ID..."
              value={filters.userId}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
              icon={<User className="text-slate-400" size={18} />}
            />
            
            <Input
              type="date"
              label="Start Date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              icon={<Calendar className="text-slate-400" size={18} />}
            />
            
            <Input
              type="date"
              label="End Date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              icon={<Calendar className="text-slate-400" size={18} />}
            />
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              onClick={clearFilters}
              disabled={!Object.values(filters).some(Boolean)}
            >
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Timestamp</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Action</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Target</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="h-4 bg-slate-200 rounded w-32" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-slate-200 rounded w-24" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-slate-200 rounded w-40" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-slate-200 rounded w-32" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-slate-200 rounded w-48" />
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <div className="font-medium text-slate-800">
                          {log.user?.full_name || log.user?.username || 'Unknown'}
                        </div>
                        <div className="text-slate-500">{log.performed_by}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <div className="font-medium text-slate-800">{log.target_type}</div>
                        <div className="text-slate-500">{log.target_id}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <pre className="text-sm text-slate-600 whitespace-pre-wrap">
                        {formatMetadata(log.metadata)}
                      </pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalCount > LOGS_PER_PAGE && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Showing {page * LOGS_PER_PAGE + 1} to{' '}
              {Math.min((page + 1) * LOGS_PER_PAGE, totalCount)} of {totalCount} logs
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
                disabled={(page + 1) * LOGS_PER_PAGE >= totalCount}
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

export default AuditLogViewer;