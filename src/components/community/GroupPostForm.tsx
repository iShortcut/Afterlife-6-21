import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Image as ImageIcon, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import TextArea from '../ui/TextArea';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface GroupPostFormProps {
  groupId: string;
  onPostCreated: () => void;
  className?: string;
}

// Validation schema
const postSchema = z.object({
  content: z.string().min(1, 'Post content is required')
});

type PostFormData = z.infer<typeof postSchema>;

const GroupPostForm = ({ groupId, onPostCreated, className = '' }: GroupPostFormProps) => {
  const { user } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { 
    register, 
    handleSubmit, 
    reset,
    formState: { errors } 
  } = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      content: ''
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > 4) {
      toast.error('You can only upload up to 4 images');
      return;
    }

    setSelectedFiles(prev => [...prev, ...files]);

    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit: SubmitHandler<PostFormData> = async (data) => {
    if (!user) {
      toast.error('You must be logged in to create a post');
      return;
    }
    
    try {
      setLoading(true);
      
      // Upload images first if any
      const mediaIds: string[] = [];
      
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const uniqueId = Date.now().toString();
          const ext = file.name.split('.').pop();
          const path = `group-posts/${groupId}/${user.id}/${uniqueId}.${ext}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('media')
            .upload(path, file, {
              cacheControl: '3600',
              upsert: true
            });

          if (uploadError) throw uploadError;

          // Create media record
          const { data: media, error: mediaError } = await supabase
            .from('media')
            .insert({
              uploader_id: user.id,
              storage_path: path,
              entity_type: 'group_post',
              metadata: {
                file_name: file.name,
                mime_type: file.type,
                size_bytes: file.size
              }
            })
            .select()
            .single();

          if (mediaError) throw mediaError;
          mediaIds.push(media.id);
        }
      }
      
      // Create post
      const { error: postError } = await supabase
        .from('group_posts')
        .insert({
          group_id: groupId,
          author_id: user.id,
          content: data.content.trim(),
          media_ids: mediaIds.length > 0 ? mediaIds : []
        });
        
      if (postError) throw postError;
      
      // Reset form
      reset();
      setSelectedFiles([]);
      setPreviews([]);
      
      toast.success('Post created successfully');
      onPostCreated();
      
    } catch (err) {
      console.error('Error creating post:', err);
      toast.error('Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
      <TextArea
        placeholder="Share something with the group..."
        {...register('content')}
        minRows={3}
        className="mb-4"
        error={errors.content?.message}
      />
      
      {/* Image Previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative aspect-square">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-full object-cover rounded-md"
              />
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute top-1 right-1 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-70 transition-opacity"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <div>
          <input
            type="file"
            id="image-upload"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <label
            htmlFor="image-upload"
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 bg-slate-100 rounded-md cursor-pointer hover:bg-slate-200 transition-colors"
          >
            <ImageIcon size={18} />
            <span>Add Images</span>
          </label>
        </div>
        
        <Button
          type="submit"
          disabled={loading}
          isLoading={loading}
        >
          Post
        </Button>
      </div>
    </form>
  );
};

export default GroupPostForm;