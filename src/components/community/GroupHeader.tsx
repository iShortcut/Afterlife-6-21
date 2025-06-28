import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, EyeOff, Settings, UserPlus, UserMinus, Users, Edit } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { CommunityGroup } from '../../types';
import Button from '../ui/Button';
import JoinRequestButton from './JoinRequestButton';
import GroupInviteModal from './GroupInviteModal';
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
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [description, setDescription] = useState(group.description || '');

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
          role: 'MEMBER'
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

  const handleSaveDescription = async () => {
    if (!user || !group.is_admin) return;

    try {
      const { error } = await supabase
        .from('community_groups')
        .update({ description })
        .eq('id', group.id);

      if (error) throw error;

      toast.success('Group description updated');
      onGroupUpdated();
      setIsEditingDescription(false);
    } catch (err) {
      console.error('Error updating group description:', err);
      toast.error('Failed to update group description');
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
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-2"
                >
                  <UserPlus size={18} />
                  <span>Invite Members</span>
                </Button>
                
                <Link to={`/groups/${group.id}/settings`}>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Settings size={18} />
                    <span>Manage Group</span>
                  </Button>
                </Link>
              </>
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
            ) : group.privacy === 'public' ? (
              <Button 
                onClick={handleJoinGroup}
                isLoading={joining}
                className="flex items-center gap-2"
              >
                <UserPlus size={18} />
                <span>Join Group</span>
              </Button>
            ) : (
              <JoinRequestButton 
                groupId={group.id}
                groupName={group.name}
              />
            )}
          </div>
        </div>
        
        {isEditingDescription ? (
          <div className="mt-4 flex flex-col gap-2">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setIsEditingDescription(false);
                  setDescription(group.description || '');
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveDescription}>Save</Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 relative">
            {group.description && (
              <p className="text-slate-600 max-w-3xl">{group.description}</p>
            )}
            {!group.description && (
              <p className="text-slate-400 italic">No description provided</p>
            )}
            {group.is_admin && (
              <button 
                onClick={() => setIsEditingDescription(true)}
                className="absolute top-0 right-0 p-1 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-slate-100"
                aria-label="Edit description"
              >
                <Edit size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <GroupInviteModal
          groupId={group.id}
          groupName={group.name}
          onClose={() => setShowInviteModal(false)}
          onInvitationsSent={onGroupUpdated}
        />
      )}
    </div>
  );
};

export default GroupHeader;