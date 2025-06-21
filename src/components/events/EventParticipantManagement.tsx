// File: src/components/events/EventParticipantManagement.tsx
// Last Updated: 2025-06-18, 11:54
// Task: 7.1 - Update data fetching logic

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import AttendeeList from './AttendeeList';
import { Attendee } from '../../types'; // Make sure this type is correctly defined
import Modal from '../ui/Modal'; // Assuming a generic Modal component exists

interface EventParticipantManagementProps {
  eventId: number;
  isOpen: boolean;
  onClose: () => void;
}

const EventParticipantManagement: React.FC<EventParticipantManagementProps> = ({ eventId, isOpen, onClose }) => {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendees = useCallback(async () => {
    if (!eventId) return;

    setLoading(true);
    setError(null);

    try {
      // English comment for code standard
      // Task 7.1: Fetch attendees and join with the profiles table to get user details.
      // Also fetch guest_email for non-registered users.
      const { data, error: fetchError } = await supabase
        .from('event_attendees')
        .select(`
          status,
          is_guest,
          guest_name,
          guest_email,
          profiles (
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('event_id', eventId);

      if (fetchError) throw fetchError;

      if (data) {
        setAttendees(data as Attendee[]);
      }
    } catch (err: any) {
      console.error("Error fetching attendees:", err);
      setError(err.message || "Failed to load participants.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (isOpen) {
      fetchAttendees();
    }
  }, [isOpen, fetchAttendees]);

  return (
    <Modal title="Manage Participants" isOpen={isOpen} onClose={onClose}>
      <div className="p-4">
        {loading && <div>Loading participants...</div>}
        {error && <div className="text-red-500">{error}</div>}
        {!loading && !error && (
          <AttendeeList attendees={attendees} />
        )}
      </div>
    </Modal>
  );
};

export default EventParticipantManagement;