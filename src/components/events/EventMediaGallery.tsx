import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Image as ImageIcon, Video, Trash2, ExternalLink } from 'lucide-react';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface EventMedia {
  id: string;
  storage_path: string;
  public_url: string;
  metadata: {
    file_name?: string;
    file_type?: string;
    media_type?: 'image' | 'video';
  };
}

interface EventMediaGalleryProps {
  eventId: string;
  isOwner?: boolean;
  className?: string;
}

const EventMediaGallery: React.FC<EventMediaGalleryProps> = ({
  eventId,
  isOwner = false,
  className = ''
}) => {
  const [media, setMedia] = useState<EventMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchEventMedia();
  }, [eventId]);

  const fetchEventMedia = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch media records for this event
      const { data, error: fetchError } = await supabase
        .from('media')
        .select('id, storage_path, metadata')
        .eq('entity_type', 'event')
        .eq('entity_id', eventId);

      if (fetchError) throw fetchError;

      if (!data || data.length === 0) {
        setMedia([]);
        return;
      }

      // Get public URLs for each media item
      const mediaWithUrls = data.map(item => {
        const { data: urlData } = supabase.storage
          .from('event_media')
          .getPublicUrl(item.storage_path);

        return {
          ...item,
          public_url: urlData.publicUrl
        };
      });

      setMedia(mediaWithUrls);
    } catch (err) {
      console.error('Error fetching event media:', err);
      setError('Failed to load event media');
      toast.error('Failed to load event media');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMedia = async (mediaId: string, storagePath: string) => {
    if (!isOwner) return;

    if (!confirm('Are you sure you want to delete this media?')) {
      return;
    }

    try {
      setDeletingId(mediaId);

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('event_media')
        .remove([storagePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('media')
        .delete()
        .eq('id', mediaId);

      if (dbError) throw dbError;

      // Update local state
      setMedia(prev => prev.filter(item => item.id !== mediaId));
      toast.success('Media deleted successfully');
    } catch (err) {
      console.error('Error deleting media:', err);
      toast.error('Failed to delete media');
    } finally {
      setDeletingId(null);
    }
  };

  const isVideo = (item: EventMedia) => {
    return item.metadata?.media_type === 'video' || 
           item.metadata?.file_type?.startsWith('video/') ||
           item.storage_path.match(/\.(mp4|webm|ogg)$/i);
  };

  if (loading) {
    return (
      <div className={`animate-pulse space-y-4 ${className}`}>
        <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-square bg-slate-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg ${className}`}>
        {error}
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-slate-500">No media has been uploaded for this event yet.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <h3 className="text-lg font-medium text-slate-800 mb-4">Event Media</h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {media.map(item => (
          <div key={item.id} className="relative group aspect-square">
            {isVideo(item) ? (
              <video
                src={item.public_url}
                className="w-full h-full object-cover rounded-md"
                controls
              />
            ) : (
              <img
                src={item.public_url}
                alt={item.metadata?.file_name || 'Event media'}
                className="w-full h-full object-cover rounded-md"
              />
            )}
            
            {isOwner && (
              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <a
                  href={item.public_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-white rounded-full hover:bg-slate-100"
                  title="View full size"
                >
                  <ExternalLink size={16} className="text-slate-700" />
                </a>
                
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteMedia(item.id, item.storage_path)}
                  isLoading={deletingId === item.id}
                  className="p-2 rounded-full"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventMediaGallery;