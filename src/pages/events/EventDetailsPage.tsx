// ---
// File: src/pages/events/EventDetailsPage.tsx
// Last Updated: 2025-06-21 03:59:01
// ---
// FINAL INTEGRATION: This version renders all corrected components in the proper layout.
//
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useEventAttendees } from '@/hooks/useEventAttendees';
import { RsvpControlBar } from '@/components/events/RsvpControlBar';
import { PersonalStatusDisplay } from '@/components/events/PersonalStatusDisplay';
import { AttendeesList } from '@/components/events/AttendeesList';
import { Event, EventAttendee } from '@/types';
import { format } from 'date-fns';
import { 
    Calendar, MapPin, User, Tag, Globe, Link as LinkIcon, Share, Users, Edit, Trash2, XCircle, Download 
} from 'lucide-react';

const fetchEventDetails = async (eventId: string) => {
    const { data, error } = await supabase
        .from('events')
        .select(`*, creator:profiles!creator_id (*), memorial:memorials (id, title), deceased_description`)
        .eq('id', eventId)
        .single();
    if (error) { console.error(error); return null; }
    return data as unknown as Event;
};

const EventDetailsPage = () => {
    const { id: eventId } = useParams<{ id: string }>();
    const { user } = useAuth();

    const { data: event, isLoading: isEventLoading } = useQuery({
        queryKey: ['event', eventId],
        queryFn: () => fetchEventDetails(eventId!),
        enabled: !!eventId,
    });

    const { data: attendees, isLoading: areAttendeesLoading } = useEventAttendees(eventId!);

    const { currentUserAttendee, isManager } = useMemo(() => {
        if (!user || !attendees) return { currentUserAttendee: undefined, isManager: false };
        const attendee = attendees.find(a => a.user_id === user.id);
        const manager = attendee?.role === 'manager';
        return { currentUserAttendee: attendee, isManager: manager };
    }, [user, attendees]);

    if (isEventLoading || areAttendeesLoading) {
        return <div className="p-8 text-center animate-pulse">Loading...</div>;
    }

    if (!event) {
        return <div className="p-8 text-center">Event Not Found.</div>;
    }

    const formatEventDate = (start: string, end: string | null) => {
        const startDate = new Date(start);
        const baseFormat = "EEEE, MMMM d, yyyy 'at' h:mm a";
        if (!end) return format(startDate, baseFormat);
        const endDate = new Date(end);
        return `${format(startDate, baseFormat)} to ${format(endDate, "h:mm a")}`;
    };

    // Create Google Maps search URL for the location
    const getGoogleMapsUrl = (location: string) => {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    };

    return (
        <div className="max-w-4xl mx-auto my-8">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="h-64 bg-gray-200 flex items-center justify-center">
                    <Calendar size={48} className="text-gray-400" />
                </div>
                <div className="p-6 space-y-8">
                    {/* --- Header Section --- */}
                    <section>
                        <div className="flex justify-between items-start">
                            <h1 className="text-3xl font-bold text-gray-800">{event.title}</h1>
                            <span className="mt-1 flex-shrink-0 bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1 rounded-full flex items-center"><Globe size={12} className="mr-1.5" />Public</span>
                        </div>
                        <div className="mt-4 space-y-3 text-gray-600">
                           <div className="flex items-center"><Tag size={16} className="mr-3 text-gray-400" /><span>Gravestone Unveiling</span></div>
                            <div className="flex items-center"><Calendar size={16} className="mr-3 text-gray-400" /><span>{formatEventDate(event.start_time, event.end_time)}</span></div>
                            <div className="flex items-center">
                                <MapPin size={16} className="mr-3 text-gray-400" />
                                {event.location_text ? (
                                    <a 
                                        href={getGoogleMapsUrl(event.location_text)} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline"
                                    >
                                        {event.location_text}
                                    </a>
                                ) : (
                                    <span>No location specified</span>
                                )}
                            </div>
                            {event.memorial && (
                                <div className="flex items-center">
                                    <LinkIcon size={16} className="mr-3 text-gray-400" />
                                    <span>Part of: <Link to={`/memorials/${event.memorial.id}`} className="text-blue-600 hover:underline">{event.memorial.title}</Link></span>
                                </div>
                            )}
                            <div className="flex items-center">
                                <User size={16} className="mr-3 text-gray-400" />
                                <span>Organized by: {event.creator ? (
                                    <Link to={`/profile/${event.creator.id}`} className="text-blue-600 hover:underline">
                                        {event.creator.full_name}
                                    </Link>
                                ) : (
                                    'Unknown'
                                )}
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* --- Deceased Description Section --- */}
                    {event.deceased_description && (
                        <section className="border-t pt-6">
                            <h2 className="text-xl font-semibold text-gray-800 mb-3">About the Deceased</h2>
                            <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
                                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{event.deceased_description}</p>
                            </div>
                        </section>
                    )}

                    {/* --- Details Section --- */}
                    <section className="border-t pt-6">
                        <h2 className="font-bold text-lg mb-2 text-gray-800">Event Details</h2>
                        <p className="text-gray-700 whitespace-pre-wrap">{event.description}</p>
                    </section>

                    {/* --- Actions Section --- */}
                    <section className="border-t pt-6 space-y-6">
                        {/* Share / Invite / Manage */}
                        <div>
                            <h3 className="text-base font-semibold text-gray-800 mb-3">Share This Event</h3>
                            <div className="flex flex-wrap gap-3 items-center">
                                <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"><Share size={16} className="mr-2" /> Share Event</button>
                                {isManager && <><button className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"><Users size={16} className="mr-2" /> Invite Participants</button><button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"><Users size={16} className="mr-2" /> Manage Participants</button></>}
                            </div>
                        </div>
                        {/* Calendar / Admin */}
                        <div>
                            <h3 className="text-base font-semibold text-gray-800 mb-3">Add to Calendar</h3>
                            <div className="space-y-3">
                                <div className="flex flex-wrap gap-3"><button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"><Calendar size={16} className="mr-2" /> Google Calendar</button><button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"><Calendar size={16} className="mr-2" /> Outlook</button><button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"><Download size={16} className="mr-2" /> Download .ics</button></div>
                                {isManager && (<div className="flex flex-wrap gap-3"><button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"><Edit size={16} className="mr-2" /> Edit Event</button><button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-yellow-600 hover:bg-yellow-50 transition-colors"><XCircle size={16} className="mr-2" /> Cancel Event</button><button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={16} className="mr-2" /> Delete Event</button></div>)}
                            </div>
                        </div>
                    </section>

                    {/* --- RSVP & Attendees Section --- */}
                    <section className="border-t pt-6">
                        {currentUserAttendee ? (
                            <div className="space-y-6">
                                <RsvpControlBar eventId={eventId} currentUser={currentUserAttendee} />
                                <PersonalStatusDisplay attendee={currentUserAttendee} />
                            </div>
                        ) : ( user ?
                            <div className="text-center p-4 bg-gray-50 rounded-md"><p className="text-gray-600">You are not a participant in this event.</p></div> :
                            <div className="text-center p-4 bg-gray-50 rounded-md"><p className="text-gray-600">Please log in to respond to the event.</p></div>
                        )}
                    </section>
                    <section className="border-t pt-6">
                        <AttendeesList eventId={eventId} currentUserId={user?.id} />
                    </section>
                </div>
            </div>
        </div>
    );
};

export default EventDetailsPage;