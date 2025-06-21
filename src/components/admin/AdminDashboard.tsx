import { useState, useEffect } from 'react';
import { Users, Flag, BookHeart, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DashboardStats {
  userCount: number;
  memorialCount: number;
  pendingReportsCount: number;
  messageCount: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    userCount: 0,
    memorialCount: 0,
    pendingReportsCount: 0,
    messageCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch user count
        const { count: userCount, error: userError } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true });

        if (userError) throw userError;

        // Fetch memorial count
        const { count: memorialCount, error: memorialError } = await supabase
          .from('memorials')
          .select('id', { count: 'exact', head: true });

        if (memorialError) throw memorialError;

        // Fetch pending reports count
        const { count: pendingReportsCount, error: reportsError } = await supabase
          .from('moderation_reports')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'PENDING');

        if (reportsError) throw reportsError;

        // Fetch message count
        const { count: messageCount, error: messageError } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true });

        if (messageError) throw messageError;

        setStats({
          userCount: userCount || 0,
          memorialCount: memorialCount || 0,
          pendingReportsCount: pendingReportsCount || 0,
          messageCount: messageCount || 0
        });
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Total Users',
      value: stats.userCount,
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Memorials',
      value: stats.memorialCount,
      icon: BookHeart,
      color: 'bg-indigo-500'
    },
    {
      title: 'Pending Reports',
      value: stats.pendingReportsCount,
      icon: Flag,
      color: 'bg-amber-500'
    },
    {
      title: 'Messages',
      value: stats.messageCount,
      icon: MessageSquare,
      color: 'bg-emerald-500'
    }
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-slate-800 mb-2">Admin Dashboard</h1>
        <p className="text-slate-600">Overview of system statistics and activity</p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-white`}>
                <stat.icon size={24} />
              </div>
              <div className="text-3xl font-bold text-slate-800">
                {loading ? (
                  <div className="w-16 h-8 bg-slate-200 rounded animate-pulse" />
                ) : (
                  stat.value.toLocaleString()
                )}
              </div>
            </div>
            <h3 className="text-slate-600 font-medium">{stat.title}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-slate-800 mb-4">Recent Activity</h2>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 bg-slate-200 rounded-full" />
                  <div className="flex-grow">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-1" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              Activity feed will be implemented soon
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-slate-800 mb-4">System Status</h2>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-1/3 mb-1" />
                  <div className="h-3 bg-slate-200 rounded w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600">Database</span>
                  <span className="text-sm font-medium text-emerald-600">Operational</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '95%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600">Storage</span>
                  <span className="text-sm font-medium text-emerald-600">Operational</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '87%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600">Authentication</span>
                  <span className="text-sm font-medium text-emerald-600">Operational</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;