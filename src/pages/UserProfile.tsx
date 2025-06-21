import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, AtSign, Save, Ban, Heart } from 'lucide-react';
import { supabase, uploadImage } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import ImageUpload from '../components/ui/ImageUpload';
import StartChatButton from '../components/users/StartChatButton';
import toast from 'react-hot-toast';

interface ProfileData {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_public_profile?: boolean;
}

const UserProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isPublicProfile, setIsPublicProfile] = useState(false);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      const profileId = id || user.id;
      setIsCurrentUser(!id || id === user.id);

      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, bio, is_public_profile')
          .eq('id', profileId)
          .single();

        if (fetchError) throw fetchError;

        setProfileData(data);
        setIsPublicProfile(data?.is_public_profile ?? false);

      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile data');
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, id, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!profileData) return;
    const { name, value } = e.target;
    setProfileData(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !profileData) {
      setError('You must be logged in to update your profile');
      return;
    }

    if (!profileData.full_name.trim()) {
      setError('Full name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      let avatarUrl = profileData.avatar_url;

      if (avatarFile) {
        try {
          const uniqueId = Date.now().toString();
          const ext = avatarFile.name.split('.').pop();
          const path = `avatars/${user.id}/${uniqueId}.${ext}`;

          avatarUrl = await uploadImage('memorial-images', path, avatarFile);

          const { error: mediaError } = await supabase
            .from('media')
            .insert({
              uploader_id: user.id,
              storage_path: path,
              entity_type: 'profile_avatar',
              metadata: {
                file_name: avatarFile.name,
                mime_type: avatarFile.type,
                size_bytes: avatarFile.size
              }
            });

          if (mediaError) throw mediaError;
        } catch (uploadError) {
          console.error('Error uploading avatar:', uploadError);
          throw new Error('Failed to upload avatar image');
        }
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.full_name,
          username: profileData.username,
          avatar_url: avatarUrl,
          bio: profileData.bio,
          is_public_profile: isPublicProfile
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success('Profile updated successfully');
      setIsEditing(false);

    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div className="max-w-2xl mx-auto" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-serif text-slate-800">
                {isCurrentUser ? 'Profile Settings' : `${profileData?.full_name}'s Profile`}
              </h1>
              <div className="flex gap-2">
                {!isCurrentUser && <StartChatButton userId={profileData?.id || ''} />}
                {isCurrentUser && !isEditing && (
                  <Button onClick={() => setIsEditing(true)} variant="outline" className="flex items-center gap-2">
                    <Save size={18} /> <span>Edit Profile</span>
                  </Button>
                )}
              </div>
            </div>

            {error && (<div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md">{error}</div>)}

            {isCurrentUser && isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <ImageUpload label="Profile Photo" initialImage={profileData?.avatar_url || ''} onImageChange={setAvatarFile} aspectRatio="square" />
                <Input label="Full Name" name="full_name" value={profileData?.full_name || ''} onChange={handleInputChange} icon={<User className="text-slate-400" size={18} />} required />
                <Input label="Username" name="username" value={profileData?.username || ''} onChange={handleInputChange} icon={<AtSign className="text-slate-400" size={18} />} helperText="Choose a unique username for your profile" />
                <div className="opacity-50">
                  <Input label="Email" type="email" value={user?.email || ''} icon={<Mail className="text-slate-400" size={18} />} disabled helperText="Email cannot be changed" />
                </div>
                <Input label="Bio" name="bio" value={profileData?.bio || ''} onChange={handleInputChange} helperText="Tell us a little about yourself" />
                <div className="flex items-center gap-2">
                  <input id="is_public_profile" name="is_public_profile" type="checkbox" checked={isPublicProfile} onChange={(e) => setIsPublicProfile(e.target.checked)} className="h-5 w-5 text-indigo-600 border-gray-300 rounded" />
                  <label htmlFor="is_public_profile" className="text-sm text-slate-700">Allow others to see my profile</label>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button type="submit" isLoading={saving} className="flex items-center gap-2"><Save size={18} /><span>Save Changes</span></Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  {profileData?.avatar_url ? (
                    <img src={profileData.avatar_url} alt={profileData.full_name || 'User'} className="w-24 h-24 rounded-full object-cover" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center">
                      <User size={40} className="text-indigo-500" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-medium text-slate-800">{profileData?.full_name}</h2>
                    {profileData?.username && (<p className="text-slate-500">@{profileData.username}</p>)}
                  </div>
                </div>
                {profileData?.bio && (<div><h3 className="text-sm font-medium text-slate-700 mb-2">Bio</h3><p className="text-slate-600">{profileData.bio}</p></div>)}
              </div>
            )}

            {isCurrentUser && !isEditing && (
              <div className="mt-8 pt-6 border-t border-slate-100">
                <h2 className="text-lg font-medium text-slate-800 mb-4">Additional Settings</h2>
                <div className="space-y-3">
                  <Button onClick={() => navigate('/followed-memorials')} variant="outline" fullWidth className="flex items-center gap-2 justify-start">
                    <Heart size={18} /> <span>Followed Memorials</span>
                  </Button>
                  <Button onClick={() => navigate('/blocked-users')} variant="outline" fullWidth className="flex items-center gap-2 justify-start">
                    <Ban size={18} /> <span>Blocked Users</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default UserProfile;