import { useState, useEffect } from 'react';
import { User, Shield, UserMinus, UserCog } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { GroupMember } from '../../types';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface GroupMembersListProps {
  groupId: string;
  isAdmin?: boolean;
  className?: string;
}

const GroupMembersList = ({ groupId, isAdmin = false, className = '' }: GroupMembersListProps) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const fetchMembers = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: membersError } = await supabase
        .from('group_members')
        .select(`
          id,
          group_id,
          user_id,
          role,
          joined_at,
          user:user_id (
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('group_id', groupId)
        .order('role', { ascending: true });

      if (membersError) throw membersError;
      setMembers(data || []);
    } catch (err) {
      console.error('Error fetching group members:', err);
      setError('Failed to load group members');
      toast.error('Failed to load group members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [groupId, user]);

  const handleRemoveMember = async (memberId: string) => {
    if (!user || !isAdmin) return;

    if (!confirm('Are you sure you want to remove this member?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      setMembers(prev => prev.filter(member => member.id !== memberId));
      toast.success('Member removed successfully');
    } catch (err) {
      console.error('Error removing member:', err);
      toast.error('Failed to remove member');
    }
  };

  const handleChangeRole = async (memberId: string, newRole: 'admin' | 'moderator' | 'member') => {
    if (!user || !isAdmin) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      setMembers(prev => prev.map(member => 
        member.id === memberId ? { ...member, role: newRole } : member
      ));
      toast.success(`Role updated to ${newRole}`);
    } catch (err) {
      console.error('Error updating role:', err);
      toast.error('Failed to update role');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">Admin</span>;
      case 'moderator':
        return <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 rounded-full">Moderator</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-800 rounded-full">Member</span>;
    }
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-10 h-10 bg-slate-200 rounded-full" />
            <div className="flex-grow">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-1" />
              <div className="h-3 bg-slate-200 rounded w-1/4" />
            </div>
            <div className="h-6 w-16 bg-slate-200 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg ${className}`}>
        {error}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-medium text-slate-800 mb-4">
        Members ({members.length})
      </h3>
      
      {members.map(member => (
        <div key={member.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
          <div className="flex items-center gap-3">
            {member.user?.avatar_url ? (
              <img
                src={member.user.avatar_url}
                alt={member.user.full_name || 'User'}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <User size={20} className="text-indigo-500" />
              </div>
            )}
            
            <div>
              <div className="font-medium text-slate-800">
                {member.user?.full_name || member.user?.username || 'Anonymous'}
              </div>
              {member.user?.username && (
                <div className="text-xs text-slate-500">
                  @{member.user.username}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {getRoleBadge(member.role)}
            
            {isAdmin && user?.id !== member.user_id && (
              <div className="relative">
                <button
                  onClick={() => setActiveMenu(activeMenu === member.id ? null : member.id)}
                  className="p-2 text-slate-500 hover:text-slate-700 rounded-full hover:bg-slate-100"
                >
                  <UserCog size={18} />
                </button>
                
                {activeMenu === member.id && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 py-1">
                    <h4 className="px-4 py-2 text-xs font-medium text-slate-500 uppercase">Change Role</h4>
                    
                    <button
                      onClick={() => {
                        handleChangeRole(member.id, 'admin');
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 flex items-center gap-2"
                    >
                      <Shield size={16} className="text-indigo-600" />
                      <span>Make Admin</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        handleChangeRole(member.id, 'moderator');
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 flex items-center gap-2"
                    >
                      <Shield size={16} className="text-emerald-600" />
                      <span>Make Moderator</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        handleChangeRole(member.id, 'member');
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 flex items-center gap-2"
                    >
                      <User size={16} className="text-slate-600" />
                      <span>Regular Member</span>
                    </button>
                    
                    <div className="border-t border-slate-100 my-1"></div>
                    
                    <button
                      onClick={() => {
                        handleRemoveMember(member.id);
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-slate-100 flex items-center gap-2"
                    >
                      <UserMinus size={16} />
                      <span>Remove from Group</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default GroupMembersList;