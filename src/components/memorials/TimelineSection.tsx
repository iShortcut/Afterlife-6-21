import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, Calendar, Image } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import TimelineEventForm from './TimelineEventForm';
import SocialShareButtons from '../social/SocialShareButtons';

interface TimelineSectionProps {
  memorialId: string;
  isOwner?: boolean;
  className?: string;
}

interface TimelineEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  created_at: string;
  created_by: string;
  category_id: string | null;
  media_ids: string[] | null;
  category?: {
    id: string;
    name: string;
  } | null;
  media?: {
    id: string;
    storage_path: string;
    public_url?: string;
  }[];
}

const TimelineSection = ({ memorialId, isOwner = false, className = '' }: TimelineSectionProps) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('timeline_events')
        .select(`
          *,
          category:category_id (
            id,
            name
          )
        `)
        .eq('memorial_id', memorialId)
        .order('event_date', { ascending: true });
        
      if (fetchError) throw fetchError;
      
      // Process events to fetch media
      const eventsWithMedia = await Promise.all((data || []).map(async (event) => {
        if (event.media_ids && event.media_ids.length > 0) {
          // Fetch media details
          const { data: mediaData, error: mediaError } = await supabase
            .from('media')
            .select('id, storage_path')
            .in('id', event.media_ids);
            
          if (mediaError) throw mediaError;
          
          // Get public URLs for media
          const mediaWithUrls = mediaData?.map(media => {
            const { data: urlData } = supabase.storage
              .from('media')
              .getPublicUrl(media.storage_path);
              
            return {
              ...media,
              public_url: urlData.publicUrl
            };
          });
          
          return {
            ...event,
            media: mediaWithUrls
          };
        }
        
        return event;
      }));
      
      setEvents(eventsWithMedia);
    } catch (err) {
      console.error('Error fetching timeline events:', err);
      setError('Failed to load timeline events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    
    // Subscribe to changes
    const channel = supabase
      .channel(`memorial-${memorialId}-timeline`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timeline_events',
          filter: `memorial_id=eq.${memorialId}`
        },
        () => {
          fetchEvents();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [memorialId]);

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingEventId(null);
    fetchEvents();
  };

  const handleEditEvent = (eventId: string) => {
    setEditingEventId(eventId);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className={`animate-pulse space-y-4 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="w-32 flex-shrink-0">
              <div className="h-4 bg-slate-200 rounded w-20 mb-1" />
              <div className="h-3 bg-slate-200 rounded w-16" />
            </div>
            <div className="flex-grow">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
          </div>
        ))}
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

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-serif text-slate-800">Life Timeline</h2>
        
        {isOwner && !showForm && (
          <Button
            onClick={() => {
              setEditingEventId(null);
              setShowForm(true);
            }}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            <span>Add Event</span>
          </Button>
        )}
      </div>
      
      {showForm && (
        <TimelineEventForm
          memorialId={memorialId}
          eventId={editingEventId || undefined}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowForm(false);
            setEditingEventId(null);
          }}
          className="mb-6"
        />
      )}
      
      {events.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg">
          <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-2" />
          <p className="text-slate-600">No timeline events yet</p>
          {isOwner && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="text-indigo-600 hover:text-indigo-800 mt-2"
            >
              Add the first event
            </button>
          )}
        </div>
      ) : (
        <div className="relative pl-8 before:content-[''] before:absolute before:left-4 before:top-0 before:bottom-0 before:w-px before:bg-slate-200">
          {events.map((event, index) => (
            <div
              key={event.id}
              className={`relative pb-8 ${index === events.length - 1 ? '' : ''}`}
            >
              <div className="absolute left-[-2.05rem] bg-white rounded-full border-4 border-indigo-100 w-4 h-4" />
              
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                  <h3 className="font-medium text-slate-800">{event.title}</h3>
                  <div className="flex items-center gap-2">
                    <time className="text-sm text-slate-500">
                      {format(new Date(event.event_date), 'MMMM d, yyyy')}
                    </time>
                    {event.category && (
                      <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">
                        {event.category.name}
                      </span>
                    )}
                  </div>
                </div>
                
                {event.description && (
                  <p className="text-slate-600 whitespace-pre-line mb-4">
                    {event.description}
                  </p>
                )}
                
                {/* Display media if available */}
                {event.media && event.media.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                    {event.media.map((media, idx) => (
                      <div key={idx} className="aspect-square">
                        <img 
                          src={media.public_url} 
                          alt={`Event media ${idx + 1}`}
                          className="w-full h-full object-cover rounded-md"
                        />
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-3">
                  {/* Social Share Buttons */}
                  <SocialShareButtons
                    url={`${window.location.origin}/memorials/${memorialId}?event=${event.id}`}
                    title={`${event.title} - ${format(new Date(event.event_date), 'MMMM d, yyyy')}`}
                    description={event.description || ''}
                    size={24}
                    compact={true}
                  />
                  
                  {isOwner && (
                    <button
                      onClick={() => handleEditEvent(event.id)}
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      Edit
                    </button>
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

export default TimelineSection;