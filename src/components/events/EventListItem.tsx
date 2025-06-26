import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, User, EyeIcon, Clock, CheckCircle, XCircle, Link as LinkIcon, SquarePen } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { EventWithRsvp, RsvpStatus } from '../../types';

interface EventListItemProps {
  event: EventWithRsvp;
  className?: string;
  onRsvpChange: (eventId: string, newStatus: RsvpStatus) => void;
}

const EventListItem: React.FC<EventListItemProps> = ({ event, className = '', onRsvpChange }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const formatEventDate = (start: string) => {
    if (!start) return 'N/A';
    try { return format(new Date(start), 'MMM d, HH:mm'); }
    catch { return "Invalid Date"; }
  };
  
  const getRsvpStatusDisplay = () => {
    if (!user || !event.user_rsvp_status) return null;
    let rsvpText: string = event.user_rsvp_status.charAt(0).toUpperCase() + event.user_rsvp_status.slice(1);
    let IconComponent: React.ElementType = Clock;
    let colors = 'text-yellow-600';

    switch (event.user_rsvp_status) {
      case 'accepted': rsvpText = 'Attending'; IconComponent = CheckCircle; colors = 'text-green-600'; break;
      case 'declined': rsvpText = 'Not Attending'; IconComponent = XCircle; colors = 'text-red-600'; break;
      case 'maybe': IconComponent = Clock; break;
    }
    return <div className={`flex items-center gap-1.5 text-xs font-medium ${colors}`}><IconComponent size={14} /><span>{rsvpText}</span></div>;
  };

  const canEditEvent = user && event.creator_id === user.id;
  const showRsvpControls = (event.user_rsvp_status !== null || event.visibility === 'public') && event.event_status === 'published';

  return (
    <div className={`bg-white dark:bg-gray-750 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 p-3 ${className}`}>
      <div className="flex items-start space-x-3 rtl:space-x-reverse mb-2">
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <User size={18} className="text-gray-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-800 truncate" title={event.title}>{event.title}</h4>
          <p className="text-xs text-gray-500 mt-0.5"><Calendar size={12} className="inline mr-1.5" />{formatEventDate(event.start_time)}</p>
          {event.memorial_title && (
            <div className="mt-1">
              <Link to={`/memorials/${event.memorial_id}`} className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:underline font-medium">
                <LinkIcon size={12} /><span>{event.memorial_title}</span>
              </Link>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center">
        <div>
          {showRsvpControls ? (
            <div className="flex items-center gap-x-3">
              <span className="text-xs font-medium text-gray-500">Respond:</span>
              <button onClick={() => onRsvpChange(event.id, 'accepted')} disabled={event.user_rsvp_status === 'accepted'} title="Confirm" className={`transition-colors ${event.user_rsvp_status === 'accepted' ? 'text-green-500' : 'text-gray-400 hover:text-green-500'}`}><CheckCircle size={18} /></button>
              <button onClick={() => onRsvpChange(event.id, 'maybe')} disabled={event.user_rsvp_status === 'maybe'} title="Maybe" className={`transition-colors ${event.user_rsvp_status === 'maybe' ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}><Clock size={18} /></button>
              <button onClick={() => onRsvpChange(event.id, 'declined')} disabled={event.user_rsvp_status === 'declined'} title="Decline" className={`transition-colors ${event.user_rsvp_status === 'declined' ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}><XCircle size={18} /></button>
            </div>
          ) : ( getRsvpStatusDisplay() )}
        </div>
        <div className="flex items-center gap-x-3">
          <button onClick={() => navigate(`/events/${event.id}`)} className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-blue-600" title="View"><EyeIcon className="h-4 w-4" /><span>View</span></button>
          {canEditEvent && (<button onClick={() => navigate(`/events/${event.id}/edit`)} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800" title="Edit"><SquarePen className="h-4 w-4" /><span>Edit</span></button>)}
        </div>
      </div>
    </div>
  );
};

export default EventListItem;