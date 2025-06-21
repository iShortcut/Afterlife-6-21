// ---
// File: src/pages/events/EditEventPage.tsx
// Last Updated: 2025-06-21 04:38:21
// ---
// FINAL FIX: Refactoring this page to use React Query for data fetching,
// which solves the 'undefined' ID error and aligns it with EventDetailsPage.
//
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { AttendeesList } from '@/components/events/AttendeesList';
import EventEditForm from '@/components/events/EventEditForm';
import { Event } from '@/types';

// A dedicated fetch function for this page
const fetchEventForEdit = async (eventId: string) => {
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
    if (error) {
        console.error('Error fetching event for edit:', error);
        throw new Error('Failed to fetch event details.');
    }
    return data as Event;
};

const EditEventPage = () => {
    const { id: eventId } = useParams<{ id: string }>();
    const { user, loading: authLoading } = useAuth();

    // Use React Query for robust data fetching
    const { data: event, isLoading: eventLoading, error } = useQuery({
        queryKey: ['event-for-edit', eventId],
        queryFn: () => fetchEventForEdit(eventId!),
        // The query will not run until eventId is available
        enabled: !!eventId,
    });

    // Combined loading state
    if (eventLoading || authLoading) {
        return <div className="text-center p-8 animate-pulse">Loading...</div>;
    }

    if (error) {
        return <div className="text-center p-8 text-red-500">{(error as Error).message}</div>;
    }

    if (!event) {
        return <div className="text-center p-8">Event not found.</div>;
    }

    // Permission check after all data has loaded
    if (event.creator_id !== user?.id) {
        return <div className="text-center p-8 text-red-500">You do not have permission to edit this event.</div>
    }

    return (
        <div className="max-w-4xl mx-auto p-4">
            <h1 className="text-3xl font-bold mb-4">Edit Event: {event.title}</h1>

            {/* The form now receives the eventId and fetches its own data, which is a robust pattern */}
            <EventEditForm eventId={eventId!} />

            <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">Attendees</h2>
                <AttendeesList eventId={eventId!} currentUserId={user?.id} />
            </div>
        </div>
    );
};

export default EditEventPage;