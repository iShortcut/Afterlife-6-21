import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Shield, Users, Flag, ClipboardList } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import Sidebar from './Sidebar';

const AdminLayout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      try {
        // Check if user has admin role
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error || !data || data.role !== 'ADMIN') {
          navigate('/');
        }
      } catch (err) {
        console.error('Error checking admin access:', err);
        navigate('/');
      }
    };

    checkAdminAccess();
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Admin Header */}
        <div className="bg-slate-800 text-white">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-2">
              <Shield className="text-indigo-400" aria-hidden="true" />
              <h1 className="text-xl font-medium">Admin Dashboard</h1>
            </div>
          </div>
        </div>

        {/* Admin Content */}
        <div className="flex-1 container mx-auto px-4 py-8 overflow-x-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;