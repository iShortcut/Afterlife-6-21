import { useState, useEffect } from 'react';
import { Trash2, Plus, Video, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import toast from 'react-hot-toast';

interface VideoSectionProps {
  memorialId: string;
  isOwner?: boolean;
  className?: string;
}

interface Video {
  id: string;
  memorial_id: string;
  user_id: string | null;
  video_url: string;
  title: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

const VideoSection = ({ memorialId, isOwner = false, className = '' }: VideoSectionProps) => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    video_url: '',
    title: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('videos')
        .select('*')
        .eq('memorial_id', memorialId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setVideos(data || []);
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();

    // Subscribe to changes
    const channel = supabase
      .channel(`memorial-${memorialId}-videos`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'videos',
          filter: `memorial_id=eq.${memorialId}`
        },
        () => {
          fetchVideos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [memorialId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('You must be logged in to add videos');
      return;
    }

    if (!formData.video_url.trim()) {
      setError('Video URL is required');
      return;
    }

    if (!validateUrl(formData.video_url)) {
      setError('Please enter a valid URL');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const { error: insertError } = await supabase
        .from('videos')
        .insert({
          memorial_id: memorialId,
          user_id: user.id,
          video_url: formData.video_url.trim(),
          title: formData.title.trim() || null,
          description: formData.description.trim() || null
        });

      if (insertError) throw insertError;

      setFormData({
        video_url: '',
        title: '',
        description: ''
      });
      setShowAddForm(false);
      toast.success('Video added successfully');
    } catch (err) {
      console.error('Error adding video:', err);
      setError('Failed to add video');
      toast.error('Failed to add video');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!user) return;

    if (!confirm('Are you sure you want to delete this video?')) {
      return;
    }

    try {
      setDeleting(videoId);

      const { error: deleteError } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId)
        .eq('memorial_id', memorialId);

      if (deleteError) throw deleteError;

      toast.success('Video deleted');
    } catch (err) {
      console.error('Error deleting video:', err);
      toast.error('Failed to delete video');
    } finally {
      setDeleting(null);
    }
  };

  // Helper function to extract video ID from YouTube URL
  const getYoutubeEmbedUrl = (url: string) => {
    try {
      const videoUrl = new URL(url);
      let videoId = '';

      if (videoUrl.hostname.includes('youtube.com')) {
        videoId = videoUrl.searchParams.get('v') || '';
      } else if (videoUrl.hostname.includes('youtu.be')) {
        videoId = videoUrl.pathname.substring(1);
      }

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }

      // If not YouTube, return the original URL
      return url;
    } catch (e) {
      return url;
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse space-y-4 ${className}`}>
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-4">
            <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
            <div className="h-40 bg-slate-200 rounded mb-2" />
            <div className="h-3 bg-slate-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-serif text-slate-800">Videos</h2>

        {isOwner && !showAddForm && (
          <Button
            onClick={() => setShowAddForm(true)}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            <span>Add Video</span>
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md">
          {error}
        </div>
      )}

      {isOwner && showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <Input
            label="Video URL"
            name="video_url"
            value={formData.video_url}
            onChange={handleInputChange}
            placeholder="Enter YouTube or other video URL"
            required
          />

          <Input
            label="Title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Enter video title (optional)"
          />

          <TextArea
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Enter video description (optional)"
            minRows={3}
          />

          <div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddForm(false)}
              disabled={submitting}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              isLoading={submitting}
            >
              Add Video
            </Button>
          </div>
        </form>
      )}

      {videos.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg">
          <Video className="mx-auto h-12 w-12 text-slate-300 mb-2" />
          <p className="text-slate-600">No videos have been added yet</p>
          {isOwner && !showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="text-indigo-600 hover:text-indigo-800 mt-2"
            >
              Add the first video
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {videos.map(video => (
            <div key={video.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="aspect-video w-full">
                <iframe
                  src={getYoutubeEmbedUrl(video.video_url)}
                  title={video.title || 'Video'}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-lg text-slate-800">
                      {video.title || 'Untitled Video'}
                    </h3>
                    {video.description && (
                      <p className="mt-2 text-slate-600">
                        {video.description}
                      </p>
                    )}
                  </div>

                  {isOwner && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(video.id)}
                      isLoading={deleting === video.id}
                      className="text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 size={16} />
                      <span className="sr-only">Delete</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoSection;