// ---
// File: src/hooks/useUpdateRsvp.ts
// Last Updated: 2025-06-21 02:08:32
// ---
// THIS CODE REPLACES THE OLD VERSION.
// It now calls the secure RPC function ('update-rsvp-status') directly
// instead of the old Edge Function.
//
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// The status types now match the 'rsvp_status' ENUM in our database.
type RsvpStatus = 'going' | 'maybe' | 'declined';

export const useUpdateRsvp = (eventId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    // This now calls the SQL function directly and securely.
    mutationFn: async (newStatus: RsvpStatus) => {
      const { error } = await supabase.rpc('update-rsvp-status', {
        event_id_input: eventId,
        new_status: newStatus,
      });

      if (error) {
        throw new Error(error.message);
      }
    },
    // This part is crucial: it automatically refreshes the UI on success.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendees', eventId] });
    },
    onError: (error) => {
      console.error('Failed to update RSVP status via RPC:', error);
    },
  });
};