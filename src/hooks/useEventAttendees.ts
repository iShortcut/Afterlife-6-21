// ---
// File: src/hooks/useEventAttendees.ts
// Last Updated: 2025-06-21 00:35:50
// ---
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { EventAttendee } from '@/types';

const fetchEventAttendees = async (eventId: string): Promise<EventAttendee[]> => {
  const { data, error } = await supabase
    .from('event_attendees')
    .select(`
      id,
      event_id,
      user_id,
      role,
      status,
      responded_at,
      created_at,
      profiles (
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .eq('event_id', eventId);

  if (error) {
    console.error('Error fetching attendees:', error);
    throw new Error(error.message);
  }

  return data.map(attendee => ({
    ...attendee,
    profiles: Array.isArray(attendee.profiles) ? attendee.profiles[0] : attendee.profiles,
  })) as EventAttendee[];
};

/**
 * Custom hook to fetch the list of attendees for a specific event.
 */
export const useEventAttendees = (eventId: string) => {
  return useQuery({
    queryKey: ['attendees', eventId],
    queryFn: () => fetchEventAttendees(eventId),
    staleTime: 5 * 60 * 1000, 
  });
};