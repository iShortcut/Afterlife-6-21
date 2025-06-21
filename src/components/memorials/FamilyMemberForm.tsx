import { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import Button from '../ui/Button';
import ImageUpload from '../ui/ImageUpload';
import toast from 'react-hot-toast';

interface FamilyMemberFormProps {
  memorialId: string;
  memberId?: string;
  profileId?: string;
  onMemberAdded: () => void;
  onCancel?: () => void;
  className?: string;
}

// Validation schema
const familyMemberSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().optional(),
  birth_date: z.string().optional(),
  death_date: z.string().optional(),
  bio: z.string().optional(),
  avatar_url: z.string().nullable().optional(),
  profile_id: z.string().nullable().optional()
}).refine(data => {
  // If both dates are provided, ensure birth_date is before death_date
  if (data.birth_date && data.death_date) {
    return new Date(data.birth_date) < new Date(data.death_date);
  }
  return true;
}, {
  message: "Birth date must be before death date",
  path: ["death_date"]
});

type FamilyMemberFormData = z.infer<typeof familyMemberSchema>;

const FamilyMemberForm = ({
  memorialId,
  memberId,
  profileId,
  onMemberAdded,
  onCancel,
  className = ''
}: FamilyMemberFormProps) => {
  const { user } = useAuth();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingMember, setFetchingMember] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    register, 
    handleSubmit, 
    reset,
    setValue,
    watch,
    formState: { errors } 
  } = useForm<FamilyMemberFormData>({
    resolver: zodResolver(familyMemberSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      birth_date: '',
      death_date: '',
      bio: '',
      avatar_url: null,
      profile_id: profileId || null
    }
  });

  // Fetch member data if editing
  useEffect(() => {
    const fetchMember = async () => {
      if (!memberId) return;
      
      try {
        setFetchingMember(true);
        
        const { data, error } = await supabase
          .from('family_members')
          .select('*')
          .eq('id', memberId)
          .single();
          
        if (error) throw error;
        
        setValue('first_name', data.first_name);
        setValue('last_name', data.last_name || '');
        setValue('birth_date', data.birth_date || '');
        setValue('death_date', data.death_date || '');
        setValue('bio', data.bio || '');
        setValue('avatar_url', data.avatar_url);
        setValue('profile_id', data.profile_id);
      } catch (err) {
        console.error('Error fetching family member:', err);
        toast.error('Failed to load family member data');
      } finally {
        setFetchingMember(false);
      }
    };
    
    fetchMember();
  }, [memberId, setValue]);

  // Fetch profile data if provided
  useEffect(() => {
    const fetchProfile = async () => {
      if (!profileId) return;
      
      try {
        setFetchingProfile(true);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', profileId)
          .single();
          
        if (error) throw error;
        
        if (data) {
          // Split full name into first and last name
          const nameParts = data.full_name ? data.full_name.split(' ') : ['', ''];
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          setValue('first_name', firstName);
          setValue('last_name', lastName);
          setValue('avatar_url', data.avatar_url);
          setValue('profile_id', profileId);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        toast.error('Failed to load profile data');
      } finally {
        setFetchingProfile(false);
      }
    };
    
    fetchProfile();
  }, [profileId, setValue]);

  const onSubmit: SubmitHandler<FamilyMemberFormData> = async (data) => {
    if (!user) {
      setError('You must be logged in to add family members');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      let avatarUrl = data.avatar_url;
      
      // Upload avatar if provided
      if (avatarFile) {
        const uniqueId = Date.now().toString();
        const ext = avatarFile.name.split('.').pop();
        const path = `family-members/${memorialId}/${uniqueId}.${ext}`;
        
        // Upload image
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('media')
          .upload(path, avatarFile, {
            cacheControl: '3600',
            upsert: true
          });
          
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('media')
          .getPublicUrl(path);
          
        avatarUrl = urlData.publicUrl;
        
        // Create media record
        const { error: mediaError } = await supabase
          .from('media')
          .insert({
            uploader_id: user.id,
            storage_path: path,
            entity_type: 'family_member_avatar',
            metadata: {
              file_name: avatarFile.name,
              mime_type: avatarFile.type,
              size_bytes: avatarFile.size
            }
          });
          
        if (mediaError) throw mediaError;
      }
      
      if (memberId) {
        // Update existing family member
        const { error: updateError } = await supabase
          .from('family_members')
          .update({
            first_name: data.first_name.trim(),
            last_name: data.last_name?.trim() || null,
            birth_date: data.birth_date || null,
            death_date: data.death_date || null,
            bio: data.bio?.trim() || null,
            avatar_url: avatarUrl,
            profile_id: data.profile_id
          })
          .eq('id', memberId);
          
        if (updateError) throw updateError;
        
        toast.success('Family member updated successfully');
      } else {
        // Create new family member
        const { error: insertError } = await supabase
          .from('family_members')
          .insert({
            memorial_id: memorialId,
            added_by_id: user.id,
            first_name: data.first_name.trim(),
            last_name: data.last_name?.trim() || null,
            birth_date: data.birth_date || null,
            death_date: data.death_date || null,
            bio: data.bio?.trim() || null,
            avatar_url: avatarUrl,
            profile_id: data.profile_id
          });
          
        if (insertError) throw insertError;
        
        toast.success('Family member added successfully');
      }
      
      // Reset form and notify parent
      reset();
      setAvatarFile(null);
      onMemberAdded();
      
    } catch (err) {
      console.error('Error saving family member:', err);
      setError(`Failed to ${memberId ? 'update' : 'add'} family member. Please try again.`);
      toast.error(`Failed to ${memberId ? 'update' : 'add'} family member`);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingMember || fetchingProfile) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 rounded w-1/4" />
          <div className="h-10 bg-slate-200 rounded" />
          <div className="h-4 bg-slate-200 rounded w-1/4" />
          <div className="h-10 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md">
          {error}
        </div>
      )}
      
      {profileId && (
        <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-md">
          <p className="text-sm">
            This family member will be linked to a registered user profile.
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Input
          label="First Name"
          {...register('first_name')}
          placeholder="Enter first name"
          error={errors.first_name?.message}
          required
        />
        
        <Input
          label="Last Name"
          {...register('last_name')}
          placeholder="Enter last name (optional)"
          error={errors.last_name?.message}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Input
          type="date"
          label="Birth Date"
          {...register('birth_date')}
          error={errors.birth_date?.message}
        />
        
        <Input
          type="date"
          label="Death Date"
          {...register('death_date')}
          error={errors.death_date?.message}
        />
      </div>
      
      <TextArea
        label="Bio"
        {...register('bio')}
        placeholder="Enter biographical information (optional)"
        minRows={3}
        className="mb-4"
        error={errors.bio?.message}
      />
      
      <ImageUpload
        label="Profile Photo"
        initialImage={watch('avatar_url')}
        onImageChange={setAvatarFile}
        aspectRatio="square"
        className="mb-6"
      />
      
      <input
        type="hidden"
        {...register('profile_id')}
      />
      
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
        
        <Button
          type="submit"
          isLoading={loading}
        >
          {memberId ? 'Update Family Member' : 'Add Family Member'}
        </Button>
      </div>
    </form>
  );
};

export default FamilyMemberForm;