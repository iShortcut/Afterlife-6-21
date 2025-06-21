import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { Calendar, MapPin, Globe2, Users, User, Video, ChevronDown, Loader2, Filter, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import EventListItem from './EventListItem';
import EventCoverImageDisplay from './EventCoverImageDisplay';
import Button from '../ui/Button';

interface Event {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  location_text: string | null;
  visibility: 'public' | 'private' | 'friends_only';
  creator_id: string;
  memorial_id: string | null;
  event_type_id: string | null;
  location_type: 'physical' | 'online';
  cover_image_url: string | null;
  organization_id: string | null;
  status?: 'draft' | 'published' | 'cancelled';
  tags?: string[];
  creator?: {
    id: string;
    full_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  } | null;
  memorial?: {
    id: string;
    title: string;
  } | null;
  event_types?: {
    id: string;
    name_en: string;
    icon?: string | null;
  } | null;
}

interface EventListProps {
  memorialId?: string;
  userId?: string;
  className?: string;
  limit?: number;
}

interface EventType {
  id: string;
  name_en: string;
  description_en?: string;
  icon?: string;
  religion?: string;
}

const EVENTS_PER_PAGE = 5; // Number of events to load per page

const EventList = ({ memorialId, userId, className = '', limit }: EventListProps) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // Filtering states
  const [showFilters, setShowFilters] = useState(false);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [loadingEventTypes, setLoadingEventTypes] = useState(false);

  // Fetch event types for filter dropdown
  useEffect(() => {
    const fetchEventTypes = async () => {
      try {
        setLoadingEventTypes(true);
        
        const { data, error: typesError } = await supabase
          .from('event_types')
          .select('id, name_en, description_en, icon, religion')
          .order('name_en');
          
        if (typesError) throw typesError;
        
        setEventTypes(data || []);
      } catch (err) {
        console.error('Error fetching event types:', err);
      } finally {
        setLoadingEventTypes(false);
      }
    };
    
    fetchEventTypes();
  }, []);

  // Function to fetch events with pagination and filtering
  const fetchEvents = useCallback(async (pageNumber: number, append: boolean = false) => {
    try {
      if (pageNumber === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      // Calculate range for pagination
      const from = pageNumber * EVENTS_PER_PAGE;
      const to = from + EVENTS_PER_PAGE - 1;

      // Build the query
      let query = supabase
        .from('events')
        .select(`
          *,
          creator:creator_id (
            id,
            full_name,
            username,
            avatar_url
          ),
          memorial:memorial_id (
            id,
            title
          ),
          event_types:event_type_id (
            id,
            name_en,
            icon
          )
        `)
        .gte('start_time', new Date().toISOString());

      // Apply filters based on props
      if (memorialId) {
        query = query.eq('memorial_id', memorialId);
      }

      if (userId) {
        query = query.eq('creator_id', userId);
      }

      // Apply event type filter if selected
      if (selectedEventTypeId) {
        query = query.eq('event_type_id', selectedEventTypeId);
      }

      // Apply status filter if selected
      if (selectedStatus) {
        query = query.eq('status', selectedStatus);
      } else {
        // By default, only show published events unless a specific status is selected
        query = query.eq('status', 'published');
      }

      // Order by start time
      query = query.order('start_time', { ascending: true });

      // Apply pagination
      if (limit) {
        // If limit is provided, use it instead of pagination
        query = query.limit(limit);
      } else {
        // Otherwise use range-based pagination
        query = query.range(from, to);
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      // If we're appending to existing events
      if (append) {
        setEvents(prev => [...prev, ...(data || [])]);
      } else {
        setEvents(data || []);
      }

      // Check if there are more events to load
      // If we got fewer events than requested, there are no more
      setHasMore(data && data.length === EVENTS_PER_PAGE);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events');
    } finally {
      if (pageNumber === 0) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [memorialId, userId, limit, selectedEventTypeId, selectedStatus]);

  // Reset and fetch when filters change
  useEffect(() => {
    setPage(0);
    setEvents([]);
    setHasMore(true);
    fetchEvents(0, false);
  }, [fetchEvents, selectedEventTypeId, selectedStatus]);

  // Set up intersection observer for infinite scrolling
  useEffect(() => {
    if (!loadMoreRef.current || loading || loadingMore || !hasMore || limit) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          setPage(prevPage => {
            const nextPage = prevPage + 1;
            fetchEvents(nextPage, true);
            return nextPage;
          });
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(loadMoreRef.current);

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [loading, loadingMore, hasMore, fetchEvents, limit]);

  // Subscribe to changes
  useEffect(() => {
    const channel = supabase
      .channel('events-list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: memorialId ? `memorial_id=eq.${memorialId}` : undefined
        },
        () => {
          // Reset and fetch from the beginning when data changes
          setPage(0);
          setEvents([]);
          setHasMore(true);
          fetchEvents(0, false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [memorialId, fetchEvents]);

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEvents(nextPage, true);
  };

  const clearFilters = () => {
    setSelectedEventTypeId(null);
    setSelectedStatus(null);
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
            <div className="h-32 bg-slate-200 rounded-lg mb-4"></div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-slate-200 rounded-full" />
              <div className="flex-grow">
                <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-slate-200 rounded w-1/4" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-4 bg-slate-200 rounded w-1/2" />
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
    <div className={`space-y-4 ${className}`}>
      {/* Filters Section */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5"
        >
          <Filter size={16} />
          <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
        </Button>
        
        {(selectedEventTypeId || selectedStatus) && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50"
          >
            <X size={16} />
            <span>Clear Filters</span>
          </Button>
        )}
      </div>
      
      {showFilters && (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Event Type Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Event Type
              </label>
              <select
                value={selectedEventTypeId || ''}
                onChange={(e) => setSelectedEventTypeId(e.target.value || null)}
                className="w-full px-3 py-2 bg-white border shadow-sm border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                disabled={loadingEventTypes}
              >
                <option value="">All Event Types</option>
                {eventTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name_en}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Status
              </label>
              <select
                value={selectedStatus || ''}
                onChange={(e) => setSelectedStatus(e.target.value || null)}
                className="w-full px-3 py-2 bg-white border shadow-sm border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-slate-500">
            {events.length} {events.length === 1 ? 'event' : 'events'} found
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <div className={`bg-white rounded-lg shadow-sm p-8 text-center ${className}`}>
          <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-2" />
          <p className="text-slate-600">No events found</p>
          {(selectedEventTypeId || selectedStatus) ? (
            <p className="text-sm text-slate-500 mt-2">
              Try changing your filter settings
            </p>
          ) : (
            <Link to="/events/create" className="text-indigo-600 hover:text-indigo-800 mt-2 inline-block">
              Create an event
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {events.map(event => (
            <EventListItem key={event.id} event={event} />
          ))}

          {/* Load more section */}
          {!limit && (
            <div ref={loadMoreRef} className="py-4 text-center">
              {loadingMore ? (
                <div className="flex justify-center items-center">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mr-2" />
                  <span className="text-slate-600">Loading more events...</span>
                </div>
              ) : hasMore ? (
                <Button 
                  variant="outline" 
                  onClick={handleLoadMore}
                  className="flex items-center gap-2"
                >
                  <ChevronDown size={16} />
                  <span>Load More Events</span>
                </Button>
              ) : events.length > 0 ? (
                <p className="text-slate-500 text-sm">No more events to load</p>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EventList;