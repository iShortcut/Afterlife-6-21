// ---
// File: src/components/events/AttendeesList.tsx
// Last Updated: 2025-06-21 02:31:58
// ---
// This is the final, corrected version of the component.
// It uses the correct 'rsvp' field for filtering and the correct named 'Input' import.
//
import { useState, useMemo } from 'react';
import { useEventAttendees } from '@/hooks/useEventAttendees';
import { AttendeeRow } from './AttendeeRow';
import { EventAttendee } from '@/types';
import Input from '@/components/ui/Input'; // [Corrected] Using a default import

// Define the type for our tabs, including 'all'
type StatusTab = 'going' | 'maybe' | 'declined' | 'all';

interface AttendeesListProps {
    eventId: string;
    currentUserId: string | undefined;
}

export const AttendeesList = ({ eventId, currentUserId }: AttendeesListProps) => {
    const { data: attendees = [], isLoading, error } = useEventAttendees(eventId);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<StatusTab>('all');

    const isManager = useMemo(() => {
        return attendees.find(a => a.user_id === currentUserId)?.role === 'manager';
    }, [attendees, currentUserId]);

    const filteredAttendees = useMemo(() => {
        return attendees
            // [Corrected] Filtering by the 'rsvp' field, not 'status'
            .filter(attendee => {
                if (activeTab === 'all') return true;
                return attendee.rsvp === activeTab;
            })
            .filter(attendee => {
                const profile = attendee.profiles;
                if (!profile) return false;
                const searchTermLower = searchTerm.toLowerCase();
                return (
                    profile.full_name?.toLowerCase().includes(searchTermLower) ||
                    profile.username?.toLowerCase().includes(searchTermLower)
                );
            });
    }, [attendees, activeTab, searchTerm]);

    const handleDelete = (attendeeId: number) => {
        alert(`Deletion logic for attendee ID ${attendeeId} would be implemented here.`);
    };

    // [Corrected] TABS constant now uses the correct status values
    const TABS: { label: string; status: StatusTab }[] = [
        { label: 'All', status: 'all' },
        { label: 'Going', status: 'going' },
        { label: 'Maybe', status: 'maybe' },
        { label: 'Declined', status: 'declined' },
    ];

    if (isLoading) return <p className="text-center p-4">Loading attendees...</p>;
    if (error) return <p className="text-center p-4 text-red-500">Failed to load attendees.</p>;

    return (
        <div className="mt-6">
            <h3 className="text-xl font-bold mb-4">Attendees ({attendees.length})</h3>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                {/* Filter Bar */}
                <div className="flex items-center border-b border-gray-200 pb-3 mb-3">
                    <div className="flex flex-wrap gap-1">
                        {TABS.map(({ label, status }) => {
                            // [Corrected] Count logic now uses the 'rsvp' field
                            const count = status === 'all'
                                ? attendees.length
                                : attendees.filter(a => a.rsvp === status).length;

                            return (
                                <button
                                    key={status}
                                    onClick={() => setActiveTab(status)}
                                    className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                                        activeTab === status
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    {label} <span className="text-xs opacity-75">{count}</span>
                                </button>
                            );
                        })}
                    </div>
                    <div className="ml-auto w-full max-w-xs mt-2 sm:mt-0 sm:ml-4">
                        <Input
                            type="text"
                            placeholder="Search attendees..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Attendees List */}
                <div className="space-y-1">
                    {filteredAttendees.length > 0 ? (
                        filteredAttendees.map(attendee => (
                            <AttendeeRow
                                key={attendee.id}
                                attendee={attendee}
                                canDelete={isManager && attendee.user_id !== currentUserId}
                                onDelete={handleDelete}
                            />
                        ))
                    ) : (
                        <p className="text-center text-gray-500 py-8">No attendees found.</p>
                    )}
                </div>
            </div>
        </div>
    );
};