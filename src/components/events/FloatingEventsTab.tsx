// Last updated in chat: 2025-06-12 15:15:30
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Plus, X, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import { EventWithRsvp, RsvpStatus } from '../../types';
import EventListItem from './EventListItem';

const FloatingEventsTab = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [events, setEvents] = useState<EventWithRsvp[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchEvents = async () => {
        if (!user) return;
        setLoading(true); setError(null);
        try {
            const { data, error: rpcError } = await supabase
                .rpc('get_upcoming_events_with_rsvp', { p_user_id: user.id });
            if (rpcError) throw rpcError;
            setEvents(data || []);
        } catch (err: any) {
            console.error("Error fetching events:", err);
            setError(err.message || "Failed to fetch events.");
        } finally {
            setLoading(false);
        }
    };

    const handleRsvpStatusUpdate = async (eventId: string, newStatus: RsvpStatus) => {
        if (!user) {
            toast.error("You must be logged in to RSVP.");
            return;
        }
        const originalEvents = [...events];
        setEvents(prevEvents =>
            prevEvents.map(event =>
                event.id === eventId ? { ...event, user_rsvp_status: newStatus } : event
            )
        );
        try {
            const { error: rpcError } = await supabase.rpc('upsert_event_rsvp', {
                p_event_id: eventId,
                p_user_profile_id: user.id, // Using correct parameter
                p_rsvp_status: newStatus
            });
            if (rpcError) throw rpcError;
            toast.success('RSVP updated!');

            // Logic to create notification for RSVP change (added here!)
            // Call Edge Function to create notification
            const { error: notificationError } = await supabase.functions.invoke('handle-new-rsvp-notification', {
                body: {
                    event_id: eventId,
                    user_id: user.id,
                    status: newStatus // The new status being sent to DB
                }
            });

            if (notificationError) {
                console.error("FloatingEventsTab: Error invoking handle-new-rsvp-notification:", notificationError);
                // Do not throw error here to avoid breaking the main RSVP update
            } else {
                console.log("FloatingEventsTab: Notification for RSVP change invoked successfully.");
            }

        } catch (e: any) {
            console.error("Error updating RSVP:", e);
            toast.error('Failed to update RSVP. Please try again.');
            setEvents(originalEvents);
        }
    };

    useEffect(() => {
        if (isOpen && user) {
            fetchEvents();
        }
    }, [isOpen, user]);

    const toggleTab = () => setIsOpen(!isOpen);
    const handleCreateEvent = () => { navigate('/events/create'); setIsOpen(false); };

    return (
        <>
            {user && (
                <button onClick={toggleTab} className={`fixed hidden md:flex items-center justify-center z-50 transition-all duration-300 ease-in-out bg-indigo-600 text-white p-3 rounded-l-lg shadow-lg hover:bg-indigo-700 ${isOpen ? 'right-[384px]' : 'right-0'} top-28`} >
                    {isOpen ? <ChevronRight size={24} /> : (
                        <div className="flex flex-col items-center"><Calendar size={20} /><span className="text-xs mt-1">Events</span></div>
                    )}
                </button>
            )}

            <AnimatePresence>
                {isOpen && user && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-30 z-40" onClick={toggleTab} />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="fixed top-24 right-4 w-full max-w-sm bg-white dark:bg-gray-800 shadow-xl z-50 flex flex-col rounded-lg"
                            style={{ height: '424px' }} // Fixed height: 2 cards + title + button + spacing
                        >
                            <div className="flex-shrink-0 flex justify-between items-center p-4 border-b dark:border-gray-700">
                                <h2 className="text-lg font-semibold">Upcoming Events</h2>
                                <button onClick={toggleTab} aria-label="Close"><X size={24} /></button>
                            </div>

                            <div className="flex-grow overflow-y-auto p-4" style={{ maxHeight: '272px' }}>
                                {loading && <p className="text-center">Loading...</p>}
                                {error && <p className="text-center text-red-500">{error}</p>}
                                {!loading && !error && (
                                    <div>
                                        {events.length === 0 ? (
                                            <p className="text-center text-gray-500">No upcoming events.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {events.map(event => (
                                                    <EventListItem
                                                        key={event.id}
                                                        event={event}
                                                        onRsvpChange={handleRsvpStatusUpdate}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex-shrink-0 p-4 border-t dark:border-gray-700">
                                <Button onClick={handleCreateEvent} fullWidth><Plus className="mr-2 h-4 w-4" /> Create New Event</Button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};
export default FloatingEventsTab;