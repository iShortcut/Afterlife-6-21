import { useState, useEffect } from 'react';
import { Search, Filter, User, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Button from '../ui/Button';
import Input from '../ui/Input';
import toast from 'react-hot-toast';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  role: string;
  created_at: string;
}

const USERS_PER_PAGE = 10;

const AdminUserList = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('profiles')
        .select('id, email, full_name, username, avatar_url, status, role, created_at', { count: 'exact' });

      // Apply search filter if provided
      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      // Apply status filter if provided
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      // Apply pagination
      const { data, count, error: fetchError } = await query
        .order('created_at', { ascending: false })
        .range(page * USERS_PER_PAGE, (page + 1) * USERS_PER_PAGE - 1);

      if (fetchError) throw fetchError;

      setUsers(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, searchQuery, statusFilter]);

  const handleStatusChange = async (userId: string, newStatus: 'ACTIVE' | 'SUSPENDED' | 'BANNED') => {
    if (!confirm(`Are you sure you want to change this user's status to ${newStatus.toLowerCase()}?`)) {
      return;
    }

    try {
      setProcessingUserId(userId);

      const { data, error } = await supabase.functions.invoke('setUserStatus', {
        body: { userId, newStatus }
      });

      if (error) throw error;

      // Update the user in the local state
      setUsers(prev => 
        prev.map(user => 
          user.id === userId ? { ...user, status: newStatus } : user
        )
      );

      toast.success(`User status updated to ${newStatus.toLowerCase()}`);
    } catch (err) {
      console.error('Error updating user status:', err);
      toast.error('Failed to update user status');
    } finally {
      setProcessingUserId(null);
    }
  };

  const statusColors = {
    ACTIVE: 'text-emerald-600',
    SUSPENDED: 'text-amber-600',
    BANNED: 'text-rose-600'
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-medium text-slate-800 mb-2">User Management</h2>
        <p className="text-slate-600">Manage user accounts and permissions</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        {/* Search and Filter Bar */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-grow">
              <Input
                placeholder="Search by name, username, or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(0); // Reset to first page on new search
                }}
                icon={<Search size={18} className="text-slate-400" />}
              />
            </div>
            
            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(0); // Reset to first page on filter change
                }}
                className="w-full px-3 py-2 bg-white border shadow-sm border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="BANNED">Banned</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-md m-4">
            {error}
          </div>
        )}

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Role</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Joined</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-200 rounded-full" />
                        <div>
                          <div className="h-4 bg-slate-200 rounded w-24 mb-1" />
                          <div className="h-3 bg-slate-200 rounded w-16" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-32" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-24 ml-auto" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img 
                            src={user.avatar_url} 
                            alt={user.full_name || 'User'} 
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <User size={20} className="text-indigo-500" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-slate-800">
                            {user.full_name || 'Anonymous'}
                          </div>
                          {user.username && (
                            <div className="text-sm text-slate-500">
                              @{user.username}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${statusColors[user.status]}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {user.status !== 'ACTIVE' && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(user.id, 'ACTIVE')}
                            isLoading={processingUserId === user.id}
                            className="flex items-center gap-1"
                          >
                            <CheckCircle size={16} />
                            <span>Activate</span>
                          </Button>
                        )}
                        {user.status !== 'SUSPENDED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(user.id, 'SUSPENDED')}
                            isLoading={processingUserId === user.id}
                            className="flex items-center gap-1 text-amber-600"
                          >
                            <AlertCircle size={16} />
                            <span>Suspend</span>
                          </Button>
                        )}
                        {user.status !== 'BANNED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(user.id, 'BANNED')}
                            isLoading={processingUserId === user.id}
                            className="flex items-center gap-1 text-rose-600"
                          >
                            <XCircle size={16} />
                            <span>Ban</span>
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
        {totalCount > USERS_PER_PAGE && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Showing {page * USERS_PER_PAGE + 1} to{' '}
              {Math.min((page + 1) * USERS_PER_PAGE, totalCount)} of {totalCount} users
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
                disabled={(page + 1) * USERS_PER_PAGE >= totalCount}
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

export default AdminUserList;