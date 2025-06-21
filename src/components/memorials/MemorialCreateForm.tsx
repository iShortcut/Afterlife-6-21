import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import Button from '../ui/Button';
import ImageUpload from '../ui/ImageUpload';
import OrganizationSelect from '../organizations/OrganizationSelect';
import toast from 'react-hot-toast';

// Validation schema
const memorialSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  bio: z.string().optional(),
  birth_date: z.string().optional(),
  death_date: z.string().optional(),
  visibility: z.enum(['public', 'private', 'friends_only', 'family_only']),
  tier: z.enum(['free', 'basic', 'premium']),
  org_id: z.string().nullable()
});

type MemorialFormData = z.infer<typeof memorialSchema>;

const MemorialCreateForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [userSubscription, setUserSubscription] = useState<{ tier: 'free' | 'basic' | 'premium' }>({ tier: 'free' });
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { 
    register, 
    handleSubmit, 
    setValue,
    watch,
    formState: { errors } 
  } = useForm<MemorialFormData>({
    resolver: zodResolver(memorialSchema),
    defaultValues: {
      title: '',
      bio: '',
      birth_date: '',
      death_date: '',
      visibility: 'public',
      tier: 'free',
      org_id: null
    }
  });

  // Watch tier value to validate against user's subscription
  const selectedTier = watch('tier');

  useEffect(() => {
    const fetchUserSubscription = async () => {
      if (!user) return;

      try {
        setLoading(true);

        const { data, error } = await supabase.rpc('get_user_tier', {
          user_id: user.id
        });

        if (error) throw error;
        setUserSubscription({ tier: data });
        setValue('tier', data);
      } catch (err) {
        console.error('Error fetching user subscription:', err);
        toast.error('Failed to load subscription status');
      } finally {
        setLoading(false);
      }
    };

    fetchUserSubscription();
  }, [user, setValue]);

  const onSubmit: SubmitHandler<MemorialFormData> = async (data) => {
    if (!user) {
      setError('You must be logged in to create a memorial');
      return;
    }

    // Validate tier selection
    if (data.tier !== 'free' && data.tier !== userSubscription.tier) {
      setError(`You need a ${data.tier} subscription to create this type of memorial`);
      return;
    }
    
    try {
      setSaving(true);
      setError(null);

      let profileImageUrl = null;
      let coverImageUrl = null;

      // Upload images if provided
      if (profileImage) {
        const uniqueId = Date.now().toString();
        const ext = profileImage.name.split('.').pop();
        const path = `profiles/${user.id}/${uniqueId}.${ext}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('memorial-media')
          .upload(path, profileImage, {
            cacheControl: '3600',
            upsert: true
          });
          
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('memorial-media')
          .getPublicUrl(path);
          
        profileImageUrl = urlData.publicUrl;
        
        // Create media record
        const { error: mediaError } = await supabase
          .from('media')
          .insert({
            uploader_id: user.id,
            storage_path: path,
            entity_type: 'memorial_profile',
            metadata: {
              file_name: profileImage.name,
              mime_type: profileImage.type,
              size_bytes: profileImage.size
            }
          });
          
        if (mediaError) throw mediaError;
      }
      
      if (coverImage) {
        const uniqueId = Date.now().toString();
        const ext = coverImage.name.split('.').pop();
        const path = `covers/${user.id}/${uniqueId}.${ext}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('memorial-media')
          .upload(path, coverImage, {
            cacheControl: '3600',
            upsert: true
          });
          
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('memorial-media')
          .getPublicUrl(path);
          
        coverImageUrl = urlData.publicUrl;
        
        // Create media record
        const { error: mediaError } = await supabase
          .from('media')
          .insert({
            uploader_id: user.id,
            storage_path: path,
            entity_type: 'memorial_cover',
            metadata: {
              file_name: coverImage.name,
              mime_type: coverImage.type,
              size_bytes: coverImage.size
            }
          });
          
        if (mediaError) throw mediaError;
      }

      // Create memorial
      const { data: memorial, error: memorialError } = await supabase
        .from('memorials')
        .insert({
          title: data.title.trim(),
          bio: data.bio?.trim() || null,
          birth_date: data.birth_date || null,
          death_date: data.death_date || null,
          visibility: data.visibility,
          tier: data.tier,
          profile_image_url: profileImageUrl,
          cover_image_url: coverImageUrl,
          owner_id: user.id,
          org_id: data.org_id
        })
        .select()
        .single();
        
      if (memorialError) throw memorialError;

      toast.success('Memorial created successfully');
      navigate(`/memorials/${memorial.id}`);
      
    } catch (err) {
      console.error('Error creating memorial:', err);
      setError('Failed to create the memorial. Please try again.');
      toast.error('Failed to create memorial');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-slate-200 rounded w-1/3" />
        <div className="h-32 bg-slate-200 rounded" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md">
          {error}
        </div>
      )}
      
      <Input
        label="Memorial Title"
        {...register('title')}
        placeholder="e.g., In Memory of John Smith"
        error={errors.title?.message}
        required
      />
      
      <TextArea
        label="Bio / Description"
        {...register('bio')}
        placeholder="Share memories, stories, or a brief description of your loved one's life..."
        minRows={4}
        error={errors.bio?.message}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Birth Date"
          type="date"
          {...register('birth_date')}
          error={errors.birth_date?.message}
        />
        
        <Input
          label="Death Date"
          type="date"
          {...register('death_date')}
          error={errors.death_date?.message}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ImageUpload
          label="Profile Image"
          onImageChange={setProfileImage}
          aspectRatio="profile"
        />
        
        <ImageUpload
          label="Cover Image"
          onImageChange={setCoverImage}
          aspectRatio="cover"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Visibility
          </label>
          <select
            {...register('visibility')}
            className="w-full px-3 py-2 bg-white border shadow-sm border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="public">Public - Anyone can view</option>
            <option value="friends_only">Friends Only - Only your connections can view</option>
            <option value="family_only">Family Only - Only family members can view</option>
            <option value="private">Private - Only you can view</option>
          </select>
          {errors.visibility && (
            <p className="mt-1 text-sm text-rose-600">{errors.visibility.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Memorial Tier
          </label>
          <select
            {...register('tier')}
            className="w-full px-3 py-2 bg-white border shadow-sm border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            disabled={userSubscription.tier === 'free'}
          >
            <option value="free">Free</option>
            <option value="basic" disabled={userSubscription.tier === 'free'}>
              Basic (Requires Basic Subscription)
            </option>
            <option value="premium" disabled={userSubscription.tier !== 'premium'}>
              Premium (Requires Premium Subscription)
            </option>
          </select>
          {errors.tier && (
            <p className="mt-1 text-sm text-rose-600">{errors.tier.message}</p>
          )}
          {userSubscription.tier === 'free' && (
            <p className="mt-1 text-sm text-slate-500">
              Upgrade your subscription to access more features
            </p>
          )}
        </div>
      </div>

      <OrganizationSelect
        value={watch('org_id')}
        onChange={(value) => setValue('org_id', value)}
      />
      
      <div className="flex justify-end gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/dashboard')}
        >
          Cancel
        </Button>
        
        <Button
          type="submit"
          isLoading={saving}
        >
          Create Memorial
        </Button>
      </div>
    </form>
  );
};

export default MemorialCreateForm;