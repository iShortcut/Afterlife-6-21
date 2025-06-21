// ---
// File: src/components/events/RsvpControlBar.tsx
// Last Updated: 2025-06-21 04:06:55
// ---
// FINAL FIX: Icons are smaller, AND the user's profile display is re-added
// directly within this component, as per the original spec.
//
import { Check, X, HelpCircle } from 'lucide-react';
import { useUpdateRsvp } from '@/hooks/useUpdateRsvp';
import { EventAttendee } from '@/types';
import Avatar from '@/components/users/Avatar';

interface RsvpControlBarProps {
  eventId: string;
  currentUser: EventAttendee;
}

const statusConfig = {
    going: { Icon: Check, color: 'text-green-500', label: 'Going' },
    maybe: { Icon: HelpCircle, color: 'text-blue-500', label: 'Maybe' },
    declined: { Icon: X, color: 'text-red-500', label: 'Declined' },
};

export const RsvpControlBar = ({ eventId, currentUser }: RsvpControlBarProps) => {
  const { mutate: updateRsvp, isPending } = useUpdateRsvp(eventId);
  const currentStatus = currentUser.rsvp;

  const handleStatusChange = (newStatus: 'going' | 'maybe' | 'declined') => {
    if (isPending) return;
    updateRsvp(newStatus);
  };

  if (!currentUser.profiles) return null;

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold text-gray-800">Will you attend?</p>
        <div className="flex items-center space-x-3">
          {Object.entries(statusConfig).map(([statusKey, { Icon, color }]) => (
            <button
              key={statusKey}
              onClick={() => handleStatusChange(statusKey as 'going' | 'maybe' | 'declined')}
              className={`p-1.5 rounded-full transition-colors hover:bg-gray-100 ${
                currentStatus === statusKey ? color : 'text-gray-400'
              }`}
              disabled={isPending}
              aria-label={statusKey}
            >
              <Icon size={22} />
            </button>
          ))}
        </div>
      </div>

      {/* User profile confirmation section RESTORED here */}
      <div className="flex items-center space-x-3 pt-4 border-t">
          <Avatar
              src={currentUser.profiles.avatar_url}
              alt={currentUser.profiles.full_name ?? 'User'}
              fallbackInitials={currentUser.profiles.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
          />
          <div>
              <p className="font-semibold">{currentUser.profiles.full_name}</p>
              <p className="text-sm text-gray-500">@{currentUser.profiles.username}</p>
          </div>
          {currentStatus && (
             <span className="ml-auto text-sm font-medium text-gray-600">{statusConfig[currentStatus].label}</span>
          )}
      </div>
    </div>
  );
};