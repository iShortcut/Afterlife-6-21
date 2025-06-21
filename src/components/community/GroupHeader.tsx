import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Lock, EyeOff, Settings, UserPlus, UserMinus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { CommunityGroup } from '../../types';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface GroupHeaderProps {
  group: CommunityGroup;
  onGroupUpdated: () => void;
  className?: string;
}

const GroupHeader = ({ group, onGroupUpdated, className = '' }: GroupHeaderProps) => {
  const { user } = useAuth();
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const getPrivacyIcon = () => {
    switch (group.privacy) {
      case 'private':
        return <Lock size={18} className="text-amber-500" />;
      case 'secret':
        return <EyeOff size={18} className="text-rose-500" />;
      default:
        return <Users size={18} className="text-emerald-500" />;
    }
  };

  const handleJoinGroup = async () => {
    if (!user) {
      toast.error('You must be logged in to join a group');
      return;
    }

    try {
      setJoining(true);

      // Check if the group is public (users can join directly)
      if (group.privacy !== 'public') {
        toast.error('This group requires an invitation to join');
        return;
      }

      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'member'
        });

      if (error) throw error;

      toast.success('You have joined the group');
      onGroupUpdated();
    } catch (err) {
      console.error('Error joining group:', err);
      toast.error('Failed to join group');
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!user) return;

    if (!confirm('Are you sure you want to leave this group?')) {
      return;
    }

    try {
      setLeaving(true);

      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', group.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('You have left the group');
      onGroupUpdated();
    } catch (err) {
      console.error('Error leaving group:', err);
      toast.error('Failed to leave group');
    } finally {
      setLeaving(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div 
        className="h-48 bg-cover bg-center"
        style={{ 
          backgroundImage: group.cover_image_url 
            ? `url(${group.cover_image_url})` 
            : 'url(https://images.pexels.com/photos/3280130/pexels-photo-3280130.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1)' 
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      </div>
      
      <div className="bg-white p-6 relative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {getPrivacyIcon()}
              <span className="text-sm font-medium text-slate-500 capitalize">
                {group.privacy} Group
              </span>
            </div>
            
            <h1 className="text-2xl font-serif text-slate-800">{group.name}</h1>
            
            <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
              <Users size={16} />
              <span>{group.member_count || 0} members</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            {group.is_admin && (
              <Link to={`/groups/${group.id}/settings`}>
                <Button variant="outline" className="flex items-center gap-2">
                  <Settings size={18} />
                  <span>Manage Group</span>
                </Button>
              </Link>
            )}
            
            {group.is_member ? (
              <Button 
                variant="outline" 
                onClick={handleLeaveGroup}
                isLoading={leaving}
                className="flex items-center gap-2"
              >
                <UserMinus size={18} />
                <span>Leave Group</span>
              </Button>
            ) : (
              <Button 
                onClick={handleJoinGroup}
                isLoading={joining}
                disabled={group.privacy !== 'public'}
                className="flex items-center gap-2"
              >
                <UserPlus size={18} />
                <span>Join Group</span>
              </Button>
            )}
          </div>
        </div>
        
        {group.description && (
          <p className="text-slate-600 mt-4 max-w-3xl">{group.description}</p>
        )}
      </div>
    </div>
  );
};

export default GroupHeader;