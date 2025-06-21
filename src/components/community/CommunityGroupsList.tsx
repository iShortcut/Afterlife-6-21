import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, Plus, User, Lock, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { CommunityGroup } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import toast from 'react-hot-toast';

interface CommunityGroupsListProps {
  showOnlyMine?: boolean;
  className?: string;
}

const CommunityGroupsList = ({ showOnlyMine = false, className = '' }: CommunityGroupsListProps) => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'mine'>(showOnlyMine ? 'mine' : 'all');

  const fetchGroups = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // First, get the groups the user is a member of
      const { data: memberGroups, error: memberError } = await supabase
        .from('group_members')
        .select('group_id, role')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      // Create a map of group_id -> role for quick lookup
      const membershipMap = new Map();
      memberGroups?.forEach(membership => {
        membershipMap.set(membership.group_id, membership.role);
      });

      // Fetch all groups or just the user's groups based on filter
      let query = supabase
        .from('community_groups')
        .select('*, group_members!inner(group_id)', { count: 'exact' });

      if (activeFilter === 'mine' || showOnlyMine) {
        // Only fetch groups the user is a member of
        query = query.eq('group_members.user_id', user.id);
      }

      // Apply search filter if provided
      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error: groupsError, count } = await query
        .order('created_at', { ascending: false });

      if (groupsError) throw groupsError;

      // Get member counts for each group
      const groupsWithCounts = await Promise.all((data || []).map(async (group) => {
        // Get member count
        const { count: memberCount, error: countError } = await supabase
          .from('group_members')
          .select('id', { count: 'exact', head: true })
          .eq('group_id', group.id);

        if (countError) throw countError;

        return {
          ...group,
          member_count: memberCount || 0,
          is_member: membershipMap.has(group.id),
          is_admin: membershipMap.get(group.id) === 'admin'
        };
      }));

      setGroups(groupsWithCounts);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError('Failed to load groups');
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [user, activeFilter, searchQuery, showOnlyMine]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGroups();
  };

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case 'private':
        return <Lock size={16} className="text-amber-500" />;
      case 'secret':
        return <EyeOff size={16} className="text-rose-500" />;
      default:
        return <Users size={16} className="text-emerald-500" />;
    }
  };

  return (
    <div className={className}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <form onSubmit={handleSearch} className="w-full sm:max-w-md">
          <Input
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search size={18} className="text-slate-400" />}
            className="mb-0"
          />
        </form>

        {!showOnlyMine && (
          <div className="flex gap-2">
            <Button
              variant={activeFilter === 'all' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('all')}
            >
              All Groups
            </Button>
            <Button
              variant={activeFilter === 'mine' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('mine')}
            >
              My Groups
            </Button>
          </div>
        )}

        <Link to="/groups/create">
          <Button className="flex items-center gap-2">
            <Plus size={18} />
            <span>Create Group</span>
          </Button>
        </Link>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
              <div className="h-32 bg-slate-200 rounded-lg mb-4" />
              <div className="h-6 bg-slate-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-4" />
              <div className="flex justify-between">
                <div className="h-4 bg-slate-200 rounded w-1/4" />
                <div className="h-8 bg-slate-200 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <Users className="mx-auto h-12 w-12 text-slate-300 mb-2" />
          <p className="text-slate-600 mb-4">No groups found</p>
          <Link to="/groups/create">
            <Button>Create a Group</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map(group => (
            <div key={group.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div 
                className="h-32 bg-cover bg-center"
                style={{ 
                  backgroundImage: group.cover_image_url 
                    ? `url(${group.cover_image_url})` 
                    : 'url(https://images.pexels.com/photos/3280130/pexels-photo-3280130.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1)' 
                }}
              />
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  {getPrivacyIcon(group.privacy)}
                  <span className="text-xs font-medium text-slate-500 capitalize">
                    {group.privacy}
                  </span>
                </div>
                <h3 className="text-lg font-medium text-slate-800 mb-2">{group.name}</h3>
                {group.description && (
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">{group.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm text-slate-500">
                    <User size={14} />
                    <span>{group.member_count} members</span>
                  </div>
                  <Link to={`/groups/${group.id}`}>
                    <Button size="sm">
                      {group.is_member ? 'View Group' : 'Join Group'}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommunityGroupsList;