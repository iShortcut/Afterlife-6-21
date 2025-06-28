import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Users, Lock, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import Button from '../ui/Button';
import ImageUpload from '../ui/ImageUpload';
import toast from 'react-hot-toast';

// Validation schema
const groupSchema = z.object({
  name: z.string().min(3, 'Group name must be at least 3 characters'),
  description: z.string().optional(),
  privacy: z.enum(['public', 'private', 'secret']),
  cover_image_url: z.string().nullable().optional()
});

type GroupFormData = z.infer<typeof groupSchema>;

const GroupCreateForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { 
    register, 
    handleSubmit, 
    watch,
    setValue,
    formState: { errors } 
  } = useForm<GroupFormData>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: '',
      description: '',
      privacy: 'public',
      cover_image_url: null
    }
  });

  const onSubmit: SubmitHandler<GroupFormData> = async (data) => {
    if (!user) {
      toast.error('You must be logged in to create a group');
      return;
    }

    // Add defensive check for user.id
    if (!user.id) {
      toast.error('User ID not found. Please log in again.');
      console.error('GroupCreateForm: user.id is null or undefined before group creation attempt.');
      return;
    }

    console.log('Attempting to create group with user ID:', user.id);
    
    try {
      setLoading(true);
      
      let coverImageUrl = data.cover_image_url;
      
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
        
        // Create media record only if needed - commenting out to avoid potential issues
        // const { error: mediaError } = await supabase
        //   .from('media')
        //   .insert({
        //     uploader_id: user.id,
        //     storage_path: path,
        //     entity_type: 'group_cover',
        //     metadata: {
        //       file_name: coverImage.name,
        //       mime_type: coverImage.type,
        //       size_bytes: coverImage.size
        //     }
        //   });
        //   
        // if (mediaError) throw mediaError; 
      }
      
      // Create group - ensure we're using the correct user ID from auth context
      const { data: group, error: groupError } = await supabase
        .from('community_groups')
        .insert({
          name: data.name.trim(),
          description: data.description?.trim() || null,
          created_by: user.id, // This must match the authenticated user's ID
          privacy: data.privacy,
          cover_image_url: coverImageUrl
        })
        .select()
        .single();
        
      if (groupError) {
        console.error('Group creation error:', groupError);
        throw groupError;
      }
      
      // Add creator as admin
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'ADMIN'
        });
        
      if (memberError) {
        console.error('Member creation error:', memberError);
        throw memberError;
      }
      
      toast.success('Group created successfully');
      navigate(`/groups/${group.id}`);
      
    } catch (err) {
      console.error('Error creating group:', err);
      const typedError = err as any;
      if (typedError && typedError.message) {
         toast.error(`Failed to create group: ${typedError.message}`);
      } else {
         toast.error('Failed to create group due to an unexpected error.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Input
        label="Group Name"
        {...register('name')}
        placeholder="Enter a name for your group"
        error={errors.name?.message}
        required
      />
      
      <TextArea
        label="Description"
        {...register('description')}
        placeholder="Describe what your group is about"
        minRows={3}
        error={errors.description?.message}
      />
      
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Privacy Setting
        </label>
        <div className="space-y-3">
          <label className="flex items-start p-3 border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer">
            <input
              type="radio"
              value="public"
              {...register('privacy')}
              className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
            />
            <div className="ml-3">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-emerald-500" />
                <span className="font-medium text-slate-800">Public</span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Anyone can see the group, its members and their posts.
              </p>
            </div>
          </label>
          
          <label className="flex items-start p-3 border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer">
            <input
              type="radio"
              value="private"
              {...register('privacy')}
              className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
            />
            <div className="ml-3">
              <div className="flex items-center gap-2">
                <Lock size={18} className="text-amber-500" />
                <span className="font-medium text-slate-800">Private</span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Anyone can find the group, but only members can see posts.
              </p>
            </div>
          </label>
          
          <label className="flex items-start p-3 border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer">
            <input
              type="radio"
              value="secret"
              {...register('privacy')}
              className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
            />
            <div className="ml-3">
              <div className="flex items-center gap-2">
                <EyeOff size={18} className="text-rose-500" />
                <span className="font-medium text-slate-800">Secret</span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Only members can find the group and see posts.
              </p>
            </div>
          </label>
        </div>
        {errors.privacy && (
          <p className="mt-1 text-sm text-rose-600">{errors.privacy.message}</p>
        )}
      </div>
      
      <ImageUpload
        label="Cover Image"
        initialImage={watch('cover_image_url')}
        onImageChange={setCoverImage}
        aspectRatio="cover"
      />
      
      <div className="flex justify-end gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/groups')}
        >
          Cancel
        </Button>
        
        <Button
          type="submit"
          isLoading={loading}
        >
          Create Group
        </Button>
      </div>
    </form>
  );
};

export default GroupCreateForm;