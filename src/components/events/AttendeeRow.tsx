// ---
// File: src/components/events/AttendeeRow.tsx
// Last Updated: 2025-06-21 03:59:01
// ---
// FINAL VERSION: Ensuring the delete button logic is present and clear.
//
import { EventAttendee } from '@/types';
import Avatar from '@/components/users/Avatar';
import { Trash2 } from 'lucide-react';

const statusDisplayConfig = {
    going: { label: 'Going', classes: 'bg-green-100 text-green-800' },
    maybe: { label: 'Maybe', classes: 'bg-blue-100 text-blue-800' },
    declined: { label: 'Declined', classes: 'bg-red-100 text-red-800' },
    default: { label: 'Invited', classes: 'bg-gray-100 text-gray-800' },
};

interface AttendeeRowProps {
    attendee: EventAttendee;
    canDelete: boolean;
    onDelete: (attendeeId: number) => void;
}

export const AttendeeRow = ({ attendee, canDelete, onDelete }: AttendeeRowProps) => {
    if (!attendee.profiles) {
        return null;
    }

    const displayConfig = statusDisplayConfig[attendee.rsvp as keyof typeof statusDisplayConfig] || statusDisplayConfig.default;

    return (
        <div className="flex items-center p-3 hover:bg-gray-50 rounded-md">
            <Avatar
                src={attendee.profiles.avatar_url}
                alt={attendee.profiles.full_name ?? 'User'}
                fallbackInitials={attendee.profiles.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
            />
            <div className="ml-4 flex-grow">
                <p className="font-semibold text-gray-900">{attendee.profiles.full_name}</p>
                <p className="text-sm text-gray-500">@{attendee.profiles.username}</p>
            </div>
            <div className="flex items-center space-x-4 ml-auto">
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${displayConfig.classes}`}>
                    {displayConfig.label}
                </span>

                {/* The delete button will only appear if the 'canDelete' prop is true */}
                {canDelete && (
                    <button
                        onClick={() => onDelete(attendee.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors"
                        aria-label="Remove attendee"
                    >
                        <Trash2 size={18} />
                    </button>
                )}
            </div>
        </div>
    );
};