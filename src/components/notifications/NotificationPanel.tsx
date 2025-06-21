// Last updated in chat: 2025-06-12 17:11:40
import { useState, useEffect, useCallback } from 'react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
// Removed: import { he } from 'date-fns/locale'; // Hebrew locale removed
import { Link } from 'react-router-dom';
import { Bell, Calendar, User, BookHeart, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface NotificationPanelProps {
    onClose: () => void;
    onNotificationRead?: () => void;
}

interface Notification {
    id: string;
    type: 'EVENT_INVITATION' | 'EVENT_RSVP_CHANGE' | 'MEMORIAL_TRIBUTE' | 'LIKE' | 'COMMENT' | 'FOLLOW' | 'MEMORIAL_UPDATE' | 'FRIEND_REQUEST' | 'CANDLE_LIT';
    message: string;
    entity_id: string;
    entity_type: string;
    recipient_id: string;
    sender_id?: string;
    created_at: string;
    is_read: boolean;
    metadata?: Record<string, any>;
}

const notificationIcons = {
    EVENT_INVITATION: Calendar,
    EVENT_RSVP_CHANGE: User,
    MEMORIAL_TRIBUTE: BookHeart,
    LIKE: Bell,
    COMMENT: Bell,
    FOLLOW: Bell,
    MEMORIAL_UPDATE: Bell,
    FRIEND_REQUEST: Bell,
    CANDLE_LIT: Bell,
} as const;

// Helper function to clean messages from unwanted HTML/symbols
const cleanNotificationMessage = (message: string): string => {
    if (!message || typeof message !== 'string') return '';
    // Cleaning unwanted HTML content from previous code errors
    return message
        .replace(/<span class="math-inline">/g, '')
        .replace(/<\/span>/g, '')
        .replace(/\\\{senderName\\\}/g, '[Sender]')
        .replace(/\\\{status\\\}/g, '[Status]')
        .replace(/\\\{eventData\.title\\\}/g, '[Event Title]')
        .replace(/\\\{memorialTitle\\\}/g, '[Memorial Name]');
};


const NotificationPanel = ({ onClose, onNotificationRead }: NotificationPanelProps) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNotifications = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            console.log('NotificationPanel: Fetching notifications for user:', user.id);

            const { data, error: fetchError } = await supabase
                .from('notifications')
                .select('id, type, message, entity_id, entity_type, recipient_id, sender_id, created_at, is_read, metadata')
                .eq('recipient_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (fetchError) throw fetchError;
            console.log('NotificationPanel: Notifications fetched:', data);
            setNotifications(data || []);
        } catch (err: any) {
            console.error('NotificationPanel: Error fetching notifications:', err);
            setError('Failed to load notifications: ' + (err.message || ''));
            toast.error('Failed to load notifications.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        console.log('NotificationPanel: useEffect triggered.');
        fetchNotifications();

        // Realtime Subscription (kept for future, but not active now)
        const channel = supabase
            .channel(`notification-panel-${user?.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `recipient_id=eq.${user?.id}`
                },
                () => {
                    console.log('NotificationPanel: Realtime event received. Re-fetching.');
                    fetchNotifications();
                }
            )
            .subscribe();

        return () => {
            console.log('NotificationPanel: Unsubscribing from channel.');
            supabase.removeChannel(channel);
        };
    }, [user, fetchNotifications]);

    const markAsRead = async (notificationId: string) => {
        if (!user) return;

        try {
            console.log('NotificationPanel: Marking notification as read:', notificationId);
            const { error: updateError } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId)
                .eq('recipient_id', user.id);

            if (updateError) throw updateError;

            console.log('NotificationPanel: Notification marked as read successfully.');
            // Refresh the list after marking as read to update the UI
            fetchNotifications(); // *** FIXED: Re-fetch after read action ***

            onNotificationRead?.(); // This will trigger the fetchUnreadCount in NotificationBell
        } catch (err) {
            console.error('NotificationPanel: Error marking notification as read:', err);
            toast.error('Failed to mark notification as read.');
        }
    };

    console.log('NotificationPanel: Rendering. Notifications:', notifications);
    console.log('NotificationPanel: Loading state:', loading);
    console.log('NotificationPanel: Error state:', error);

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h2 className="font-medium text-slate-800" id="notification-heading">Notifications</h2>
                <button
                    onClick={onClose}
                    className="p-1 text-slate-500 hover:text-slate-700 rounded-full hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Close notifications"
                >
                    <X size={16} aria-hidden="true" />
                </button>
            </div>

            <div
                className="divide-y divide-slate-100 max-h-[calc(100vh-200px)] overflow-y-auto"
                role="region"
                aria-labelledby="notification-heading"
            >
                {loading ? (
                    <div className="p-4 space-y-4" aria-live="polite" aria-busy="true">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-start gap-3 animate-pulse">
                                <div className="w-8 h-8 bg-slate-200 rounded-full" />
                                <div className="flex-grow">
                                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-1" />
                                    <div className="h-3 bg-slate-200 rounded w-1/4" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="p-4 text-center text-rose-600" role="alert">
                        {error}
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                        <Bell className="mx-auto h-8 w-8 text-slate-300 mb-2" aria-hidden="true" />
                        <p>No notifications yet</p>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                    >
                        {notifications.map(notification => {
                            console.log('NotificationPanel: Rendering notification:', notification);
                            const Icon = notificationIcons[notification.type as keyof typeof notificationIcons] || Bell;

                            // Determine the link for the notification
                            let notificationLink = '#'; // Default fallback
                            if (notification.entity_type === 'EVENT' && notification.entity_id) {
                                notificationLink = `/events/${notification.entity_id}`;
                            } else if (notification.entity_type === 'MEMORIAL' && notification.entity_id) {
                                notificationLink = `/memorials/${notification.entity_id}`;
                            }
                            // Add other entity types as needed

                            return (
                                <Link
                                    key={notification.id}
                                    to={notificationLink} // Use the dynamically determined link
                                    onClick={() => {
                                        markAsRead(notification.id);
                                        onClose();
                                    }}
                                    className={`
                                        block p-4 hover:bg-slate-50 transition-colors
                                        ${notification.is_read ? 'bg-white' : 'bg-indigo-50/50'}
                                    `}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`
                                            flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                                            ${notification.is_read ? 'bg-slate-100' : 'bg-indigo-100'}
                                        `}>
                                            <Icon
                                                size={16}
                                                className={notification.is_read ? 'text-slate-600' : 'text-indigo-600'}
                                                aria-hidden="true"
                                            />
                                        </div>

                                        <div className="flex-grow min-w-0">
                                            <p className={`
                                                text-sm mb-1
                                                ${notification.is_read ? 'text-slate-700' : 'text-slate-900 font-medium'}
                                                /* Removed 'truncate' from here to show full message */
                                            `}>
                                                {cleanNotificationMessage(notification.message)}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {/* FIXED: Displaying "time ago" in English */}
                                                {formatDistanceToNow(parseISO(notification.created_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default NotificationPanel;