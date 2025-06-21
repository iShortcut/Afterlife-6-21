// ---
// File: src/components/events/PersonalStatusDisplay.tsx
// Last Updated: 2025-06-21 02:30:45
// ---
// This is the complete code for the static status display component.
//
import { EventAttendee } from '@/types';
import Avatar from '@/components/users/Avatar';

// This config helps map the status from the DB to the display properties in the UI
const statusDisplayConfig = {
    going: { label: 'Going', classes: 'bg-green-100 text-green-800' },
    maybe: { label: 'Maybe', classes: 'bg-blue-100 text-blue-800' },
    declined: { label: 'Declined', classes: 'bg-red-100 text-red-800' },
};

interface PersonalStatusDisplayProps {
  attendee: EventAttendee;
}

export const PersonalStatusDisplay = ({ attendee }: PersonalStatusDisplayProps) => {
  // [Corrected] The component will not render if there's no profile data or, crucially, no RSVP status.
  if (!attendee.profiles || !attendee.rsvp) {
    return null;
  }

  const displayConfig = statusDisplayConfig[attendee.rsvp];
  // If for some reason the status is not one of the three, don't render.
  if (!displayConfig) return null;

  const { profiles } = attendee;

  return (
    <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center">
        <span className="text-base font-medium text-gray-700 mr-4">Your Status:</span>
        <div className="flex items-center space-x-3 bg-gray-50 p-2 rounded-md flex-grow">
          <Avatar
            src={profiles.avatar_url}
            alt={profiles.full_name ?? 'User'}
            fallbackInitials={profiles.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
            size="sm" // Respecting the prop from your provided code
          />
          <div className="flex-grow">
            <p className="font-semibold text-gray-900">{profiles.full_name}</p>
            {profiles.username && <p className="text-sm text-gray-500">@{profiles.username}</p>}
          </div>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${displayConfig.classes}`}>
            {displayConfig.label}
          </span>
        </div>
      </div>
    </div>
  );
};