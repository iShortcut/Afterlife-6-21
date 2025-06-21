// Last updated in chat: 2025-06-12 18:04:40
import { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import NotificationPanel from './NotificationPanel';
import toast from 'react-hot-toast';

interface NotificationBellProps {
    className?: string;
}

const NotificationBell = ({ className = '' }: NotificationBellProps) => {
    const { user } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [hasNewNotification, setHasNewNotification] = useState(false);

    const fetchUnreadCount = useCallback(async () => {
        if (!user) {
            console.log('NotificationBell: User not logged in, setting count to 0.');
            setUnreadCount(0);
            setLoading(false);
            return;
        }

        try {
            console.log(`NotificationBell: Attempting to fetch unread count for user ${user.id}.`);
            const { count, error } = await supabase
                .from('notifications')
                .select('id', { count: 'exact', head: true })
                .eq('recipient_id', user.id)
                .eq('is_read', false); // Counting unread notifications

            if (error) {
                console.error('NotificationBell: Error fetching notification count:', error);
                throw error;
            }

            const newCount = count || 0;
            console.log(`NotificationBell: Fetched new count: ${newCount}. Current state count: ${unreadCount}.`);

            // Logic for "New notification received" toast and animation
            if (newCount > unreadCount && !loading && !isOpen) {
                console.log('NotificationBell: New unread notification detected. Showing toast.');
                setHasNewNotification(true);
                toast('New notification received', {
                    icon: '🔔',
                    duration: 3000,
                });
                setTimeout(() => setHasNewNotification(false), 2000);
            } else if (newCount < unreadCount && !loading && !isOpen) {
                console.log('NotificationBell: Unread count decreased. No toast.');
            }

            setUnreadCount(newCount);
        } catch (err: any) {
            console.error('NotificationBell: Overall error fetching count:', err);
        } finally {
            setLoading(false);
        }
    }, [user, unreadCount, loading, isOpen]); // Dependencies

    useEffect(() => {
        console.log('NotificationBell: Main useEffect triggered.');
        if (!user) { // Ensure runs only if user is logged in
            console.log('NotificationBell: No user in useEffect, exiting.');
            setUnreadCount(0);
            setLoading(false);
            return;
        }

        // Polling mechanism: refresh every X seconds
        const pollInterval = setInterval(() => {
            console.log('NotificationBell: Polling interval triggered.');
            fetchUnreadCount();
        }, 5000); // Refresh every 5 seconds.

        // Initial fetch on component mount
        fetchUnreadCount();

        return () => {
            console.log('NotificationBell: Clearing polling interval.');
            clearInterval(pollInterval);
            // If there was Realtime logic, it would be removed here.
        };
    }, [user, fetchUnreadCount]); // fetchUnreadCount as dependency

    // Callback for NotificationPanel when a notification is marked as read
    const handleNotificationRead = useCallback(() => {
        console.log('NotificationBell: onNotificationRead callback fired from panel. Re-fetching count.');
        fetchUnreadCount(); // Refresh count immediately
    }, [fetchUnreadCount]);


    if (!user || loading) return null;

    return (
        <div className={`relative ${className}`}>
            <motion.button
                onClick={() => setIsOpen(!isOpen)} // Toggle open/close on click
                className="relative p-2 text-slate-600 hover:text-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-full"
                animate={hasNewNotification ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.3 }}
                aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <Bell size={20} className={hasNewNotification ? 'text-indigo-600' : undefined} aria-hidden="true" />
                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute top-0 right-0 -mt-1 -mr-1 px-1.5 py-0.5 bg-indigo-600 text-white text-xs font-medium rounded-full"
                            aria-hidden="true"
                        >
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40 bg-black bg-opacity-25"
                            onClick={() => setIsOpen(false)}
                            aria-hidden="true"
                        />

                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute right-0 mt-2 w-80 z-50"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Notifications"
                        >
                            <NotificationPanel
                                onClose={() => setIsOpen(false)}
                                onNotificationRead={handleNotificationRead} // Pass the new useCallback handler
                            />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationBell;