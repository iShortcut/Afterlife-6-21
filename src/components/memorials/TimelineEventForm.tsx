import { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface TimelineEventFormProps {
  memorialId: string;
  eventId?: string; // For editing existing events
  onSuccess: () => void;
  onCancel: () => void;
  className?: string;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
}

// Validation schema
const eventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  event_date: z.string().min(1, 'Event date is required'),
  category_id: z.string().optional()
});

type EventFormData = z.infer<typeof eventSchema>;

const TimelineEventForm = ({
  memorialId,
  eventId,
  onSuccess,
  onCancel,
  className = ''
}: TimelineEventFormProps) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingEvent, setFetchingEvent] = useState(false);
  const [fetchingCategories, setFetchingCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    register, 
    handleSubmit, 
    reset,
    setValue,
    formState: { errors }
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      description: '',
      event_date: new Date().toISOString().split('T')[0],
      category_id: ''
    }
  });

  // Fetch event categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setFetchingCategories(true);
        
        const { data, error } = await supabase
          .from('timeline_event_categories')
          .select('*')
          .order('name');
          
        if (error) throw error;
        setCategories(data || []);
      } catch (err) {
        console.error('Error fetching categories:', err);
        toast.error('Failed to load event categories');
      } finally {
        setFetchingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Fetch event data if editing
  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;
      
      try {
        setFetchingEvent(true);
        
        const { data, error } = await supabase
          .from('timeline_events')
          .select('*')
          .eq('id', eventId)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setValue('title', data.title);
          setValue('description', data.description || '');
          setValue('event_date', data.event_date);
          setValue('category_id', data.category_id || '');
          
          // Fetch media if any
          if (data.media_ids && data.media_ids.length > 0) {
            const { data: mediaData, error: mediaError } = await supabase
              .from('media')
              .select('storage_path')
              .in('id', data.media_ids);
              
            if (mediaError) throw mediaError;
            
            if (mediaData) {
              const mediaUrls = mediaData.map(media => {
                const { data: urlData } = supabase.storage
                  .from('media')
                  .getPublicUrl(media.storage_path);
                  
                return urlData.publicUrl;
              });
              
              setPreviews(mediaUrls);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching event:', err);
        toast.error('Failed to load event data');
      } finally {
        setFetchingEvent(false);
      }
    };

    fetchEvent();
  }, [eventId, setValue]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > 4) {
      setError('You can only upload up to 4 images');
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

  const onSubmit: SubmitHandler<EventFormData> = async (data) => {
    if (!user) {
      setError('You must be logged in to add timeline events');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);

      // Upload media files if any
      const mediaIds: string[] = [];
      
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const uniqueId = Date.now().toString();
          const ext = file.name.split('.').pop();
          const path = `timeline/${memorialId}/${uniqueId}.${ext}`;
          
          // Upload file
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
              entity_type: 'timeline_event',
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
      
      if (eventId) {
        // Update existing event
        const { error: updateError } = await supabase
          .from('timeline_events')
          .update({
            title: data.title.trim(),
            description: data.description?.trim() || null,
            event_date: data.event_date,
            category_id: data.category_id || null,
            media_ids: mediaIds.length > 0 ? mediaIds : undefined
          })
          .eq('id', eventId);
          
        if (updateError) throw updateError;
        
        toast.success('Event updated successfully');
      } else {
        // Create new event
        const { error: insertError } = await supabase
          .from('timeline_events')
          .insert({
            memorial_id: memorialId,
            title: data.title.trim(),
            description: data.description?.trim() || null,
            event_date: data.event_date,
            category_id: data.category_id || null,
            media_ids: mediaIds.length > 0 ? mediaIds : [],
            created_by: user.id
          });
          
        if (insertError) throw insertError;
        
        toast.success('Event added successfully');
      }
      
      reset();
      setSelectedFiles([]);
      setPreviews([]);
      onSuccess();
    } catch (err) {
      console.error('Error saving timeline event:', err);
      setError(`Failed to ${eventId ? 'update' : 'create'} the event`);
      toast.error(`Failed to ${eventId ? 'update' : 'create'} event`);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingEvent) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-4 flex justify-center items-center ${className}`}>
        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
        <span className="ml-2">Loading event data...</span>
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
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Event Title*
        </label>
        <input
          {...register('title')}
          className={`w-full px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md ${errors.title ? 'border-rose-500' : ''}`}
          placeholder="e.g., Graduated from University"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-rose-600">{errors.title.message}</p>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Event Date*
          </label>
          <div className="relative">
            <input
              type="date"
              {...register('event_date')}
              className={`w-full px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md ${errors.event_date ? 'border-rose-500' : ''}`}
            />
            <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
          </div>
          {errors.event_date && (
            <p className="mt-1 text-sm text-rose-600">{errors.event_date.message}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Category
          </label>
          <select
            {...register('category_id')}
            className="w-full px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md"
            disabled={fetchingCategories}
          >
            <option value="">Select a category</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {fetchingCategories && (
            <p className="mt-1 text-sm text-slate-500">Loading categories...</p>
          )}
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Description
        </label>
        <textarea
          {...register('description')}
          className="w-full px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md min-h-[100px]"
          placeholder="Add more details about this event..."
          rows={3}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-rose-600">{errors.description.message}</p>
        )}
      </div>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Media (up to 4 images)
        </label>
        
        {previews.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {previews.map((preview, index) => (
              <div key={index} className="relative">
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-32 object-cover rounded-md"
                />
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-md hover:bg-rose-100"
                >
                  <X size={16} className="text-rose-600" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {selectedFiles.length < 4 && (
          <div className="border-2 border-dashed border-slate-300 rounded-md p-4 text-center hover:border-indigo-400 transition-colors">
            <input
              type="file"
              id="media-upload"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <label
              htmlFor="media-upload"
              className="cursor-pointer block"
            >
              <ImageIcon className="mx-auto h-12 w-12 text-slate-400" />
              <p className="mt-2 text-sm text-slate-600">
                Click or drag and drop to upload images
              </p>
              <p className="text-xs text-slate-500">
                {4 - selectedFiles.length} image{selectedFiles.length === 3 ? '' : 's'} remaining
              </p>
            </label>
          </div>
        )}
      </div>
      
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        
        <Button
          type="submit"
          isLoading={loading}
        >
          {eventId ? 'Update Event' : 'Add Event'}
        </Button>
      </div>
    </form>
  );
};

export default TimelineEventForm;