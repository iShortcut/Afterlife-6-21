import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Users, Trash2, Edit, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { CommunityGroup } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import ImageUpload from '../ui/ImageUpload';
import GroupMembersList from './GroupMembersList';
import toast from 'react-hot-toast';

interface GroupAdminPanelProps {
  group: CommunityGroup;
  onGroupUpdated: () => void;
  className?: string;
}

const GroupAdminPanel = ({ group, onGroupUpdated, className = '' }: GroupAdminPanelProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'settings' | 'members'>('settings');
  const [formData, setFormData] = useState({
    name: group.name,
    description: group.description || '',
    privacy: group.privacy
  });
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Update form data when group changes
    setFormData({
      name: group.name,
      description: group.description || '',
      privacy: group.privacy
    });
  }, [group]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to update the group');
      return;
    }
    
    if (!formData.name.trim()) {
      setError('Group name is required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      let coverImageUrl = group.cover_image_url;
      
      // Upload cover image if provided
      if (coverImage) {
        const uniqueId = Date.now().toString();
        const ext = coverImage.name.split('.').pop();
        const path = `groups/${user.id}/${uniqueId}.${ext}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('media')
          .upload(path, coverImage, {
            cacheControl: '3600',
            upsert: true
          });
          
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('media')
          .getPublicUrl(path);
          
        coverImageUrl = urlData.publicUrl;
      }
      
      // Update group
      const { error: updateError } = await supabase
        .from('community_groups')
        .update({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          privacy: formData.privacy,
          cover_image_url: coverImageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', group.id);
        
      if (updateError) throw updateError;
      
      toast.success('Group updated successfully');
      onGroupUpdated();
      
    } catch (err) {
      console.error('Error updating group:', err);
      setError('Failed to update group');
      toast.error('Failed to update group');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!user) return;

    // Check if the current user is the creator of the group
    if (user.id !== group.created_by) {
      toast.error('Only the group creator can delete this group');
      return;
    }

    try {
      setDeleting(true);

      const { error } = await supabase
        .from('community_groups')
        .delete()
        .eq('id', group.id);

      if (error) throw error;

      toast.success('Group deleted successfully');
      navigate('/groups');
    } catch (err) {
      console.error('Error deleting group:', err);
      toast.error('Failed to delete group');
      setDeleting(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      <div className="border-b border-slate-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-3 text-sm font-medium flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings size={16} />
            <span>Group Settings</span>
          </button>
          
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-3 text-sm font-medium flex items-center gap-2 ${
              activeTab === 'members'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users size={16} />
            <span>Manage Members</span>
          </button>
        </div>
      </div>
      
      <div className="p-6">
        {activeTab === 'settings' ? (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md">
                {error}
              </div>
            )}
            
            <Input
              label="Group Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
            
            <TextArea
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              minRows={3}
            />
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Privacy Setting
              </label>
              <select
                name="privacy"
                value={formData.privacy}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-white border shadow-sm border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="public">Public - Anyone can see the group and posts</option>
                <option value="private">Private - Anyone can find the group, but only members can see posts</option>
                <option value="secret">Secret - Only members can find the group and see posts</option>
              </select>
            </div>
            
            <ImageUpload
              label="Cover Image"
              initialImage={group.cover_image_url}
              onImageChange={setCoverImage}
              aspectRatio="cover"
            />
            
            <div className="flex justify-between mt-6 pt-4 border-t border-slate-100">
              {/* Only show delete button to the group creator */}
              {user && user.id === group.created_by && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  <span>Delete Group</span>
                </Button>
              )}
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/groups/${group.id}`)}
                >
                  Cancel
                </Button>
                
                <Button
                  type="submit"
                  isLoading={loading}
                  className="flex items-center gap-2"
                >
                  <Edit size={16} />
                  <span>Save Changes</span>
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-slate-800">Group Members</h3>
              
              <Button
                variant="outline"
                className="flex items-center gap-2"
              >
                <UserPlus size={16} />
                <span>Invite Members</span>
              </Button>
            </div>
            
            <GroupMembersList groupId={group.id} isAdmin={true} />
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-medium text-slate-800 mb-4">Delete Group</h3>
            
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete this group? This action is irreversible and all group content will be permanently lost.
            </p>
            
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              
              <Button
                variant="danger"
                onClick={handleDeleteGroup}
                isLoading={deleting}
              >
                Delete Group
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupAdminPanel;