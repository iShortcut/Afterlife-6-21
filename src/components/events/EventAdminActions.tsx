import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, AlertTriangle, Calendar, X, UserPlus, Users, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import EventParticipantInviteField from './EventParticipantInviteField';

type DbRsvpStatus = 'accepted' | 'declined' | 'maybe' | 'invited';

const inviteSchema = z.object({
    invited_emails: z.array(z.string().email()).min(1, 'Please add at least one email address.'),
});
type InviteFormData = z.infer<typeof inviteSchema>;

interface EventAdminActionsProps {
    event: {
        id: string;
        title: string;
        creator_id: string;
        memorial_id?: string | null;
        status?: 'draft' | 'published' | 'cancelled';
    };
    isMemorialAdmin?: boolean;
    onEventDeleted?: () => void;
    className?: string;
    // rsvpUpdatedTrigger?: number; // <-- לא היה קיים בגרסה זו, נשמיט אותו בינתיים
}

interface EventParticipant {
    db_id: string;
    type: 'registered' | 'guest';
    identifier: string;
    display: string;
    email: string;
    avatar_url?: string | null;
    status?: DbRsvpStatus | null;
}

const EventAdminActions = ({
    event,
    isMemorialAdmin = false,
    onEventDeleted,
    className = '',
    // rsvpUpdatedTrigger // <-- לא היה קיים בגרסה זו, נשמיט אותו בינתיים
}: EventAdminActionsProps) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [cancelError, setCancelError] = useState<string | null>(null);
    const [cancellationReason, setCancellationReason] = useState('');
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [isInviting, setIsInviting] = useState(false);

    const [showManageParticipantsModal, setShowManageParticipantsModal] = useState(false);
    const [eventParticipants, setEventParticipants] = useState<EventParticipant[]>([]);
    const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);
    const [isRemovingParticipant, setIsRemovingParticipant] = useState(false);


    const inviteFormMethods = useForm<InviteFormData>({
        resolver: zodResolver(inviteSchema),
        defaultValues: { invited_emails: [] },
    });

    const hasPermission = user && (user.id === event.creator_id || isMemorialAdmin);
    const isCancelled = event.status === 'cancelled';

    const fetchEventParticipants = async () => {
        setIsLoadingParticipants(true);
        try {
            const { data: attendees, error: attendeesError } = await supabase
                .from('event_attendees')
                .select('id, user_id, status, profiles(full_name, username, avatar_url)')
                .eq('event_id', event.id);

            if (attendeesError) throw attendeesError;

            const { data: invitations, error: invitationsError } = await supabase
                .from('event_invitations')
                .select('id, email')
                .eq('event_id', event.id);

            if (invitationsError) throw invitationsError;

            const combinedParticipants: EventParticipant[] = [
                ...(attendees || []).map(att => ({
                    db_id: att.id,
                    type: 'registered',
                    identifier: att.user_id,
                    display: att.profiles?.full_name || att.profiles?.username || 'Registered User',
                    email: '',
                    avatar_url: att.profiles?.avatar_url || null,
                    status: att.status as DbRsvpStatus
                })),
                ...(invitations || []).map(inv => ({
                    db_id: inv.id,
                    type: 'guest',
                    identifier: inv.email,
                    display: inv.email,
                    email: inv.email,
                    avatar_url: null,
                    status: 'invited'
                }))
            ].filter(p => p.email || p.type === 'registered');

            combinedParticipants.sort((a, b) => a.display.localeCompare(b.display));

            setEventParticipants(combinedParticipants);
        } catch (err: any) {
            console.error('Error fetching event participants:', err);
            toast.error(err.message || 'Failed to load event participants.');
        } finally {
            setIsLoadingParticipants(false);
        }
    };

    useEffect(() => {
        if (showManageParticipantsModal) {
            fetchEventParticipants();
        }
    }, [showManageParticipantsModal, event.id]); // <-- rsvpUpdatedTrigger לא היה כאן כתלות

    const handleEdit = () => {
        navigate(`/events/${event.id}/edit`);
    };

    const handleDeleteInitiate = () => {
        setDeleteError(null);
        setShowDeleteConfirm(true);
    };

    const handleCancelInitiate = () => {
        setCancelError(null);
        setShowCancelConfirm(true);
    };

    const handleDeleteConfirm = async () => {
        setIsDeleting(true);
        setDeleteError(null);
        try {
            const { error } = await supabase.from('events').delete().eq('id', event.id);
            if (error) throw error;
            toast.success('Event deleted successfully');
            setShowDeleteConfirm(false);
            if (onEventDeleted) {
                onEventDeleted();
            } else if (event.memorial_id) {
                navigate(`/memorials/${event.memorial_id}`);
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            console.error('Error deleting event:', err);
            setDeleteError(err instanceof Error ? err.message : 'Failed to delete event');
            toast.error('Failed to delete event');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCancelConfirm = async () => {
        setIsCancelling(true);
        setCancelError(null);
        try {
            const { error } = await supabase.functions.invoke('manage-event-status', {
                body: { event_id: event.id, new_status: 'cancelled', acting_user_id: user?.id, cancellation_reason: cancellationReason }
            });
            if (error) throw error;
            toast.success('Event cancelled successfully');
            setShowCancelConfirm(false);
            window.location.reload();
        } catch (err) {
            console.error('Error cancelling event:', err);
            setCancelError(err instanceof Error ? err.message : 'Failed to cancel event');
            toast.error('Failed to cancel event');
        } finally {
            setIsCancelling(false);
        }
    };

    const handleInviteSubmit = async (data: InviteFormData) => {
        if (!user || !event.id) return;
        setIsInviting(true);
        try {
            toast.loading('Processing invitations...');
            const invitees = data.invited_emails.map(email => ({ email }));
            const { data: responseData, error: invokeError } = await supabase.functions.invoke('handle-event-invitations', {
                body: { event_id: event.id, invitees },
            });

            toast.dismiss();
            if (invokeError) throw invokeError;

            const successMessage = `Invitations processed successfully.`;
            toast.success(responseData.message || successMessage, { duration: 6000 });

            inviteFormMethods.reset();
            setShowInviteModal(false);
            fetchEventParticipants();
        } catch (err: any) {
            toast.dismiss();
            console.error("Invitation error:", err);
            toast.error(err.data?.error?.message || err.message || 'Failed to send invitations.');
        } finally {
            setIsInviting(false);
        }
    };

    const handleRemoveParticipant = async (participant: EventParticipant) => {
        if (!user || isRemovingParticipant) return;
        if (!window.confirm(`Are you sure you want to remove ${participant.display} from this event?`)) {
            return;
        }

        setIsRemovingParticipant(true);
        try {
            toast.loading(`Removing ${participant.display}...`);
            const { data, error } = await supabase.rpc('remove_event_participant', {
                p_event_id: event.id,
                p_email: participant.type === 'guest' ? participant.email : null,
                p_user_id: participant.type === 'registered' ? participant.identifier : null,
                p_acting_user_id: user.id
            });

            toast.dismiss();
            if (error) throw error;

            if (data === true) {
                toast.success(`${participant.display} removed successfully.`);
                fetchEventParticipants();
            } else {
                toast.error('Failed to remove participant: No change was made.');
            }

        } catch (err: any) {
            toast.dismiss();
            console.error('Remove participant error:', err);
            toast.error(err.message || 'Failed to remove participant.');
        } finally {
            setIsRemovingParticipant(false);
        }
    };

    if (!hasPermission) {
        return null;
    }

    return (
        <>
            <div className={`flex flex-wrap gap-3 mt-4 mb-6 border-t border-slate-200 dark:border-slate-700 pt-4 ${className}`}>
                {!isCancelled && (
                    <Button onClick={() => setShowInviteModal(true)} variant="primary" className="flex items-center gap-2">
                        <UserPlus size={16} />
                        <span>Invite Participants</span>
                    </Button>
                )}

                {!isCancelled && (
                    <Button onClick={() => setShowManageParticipantsModal(true)} variant="outline" className="flex items-center gap-2">
                        <Users size={16} />
                        <span>Manage Participants</span>
                    </Button>
                )}

                {!isCancelled && (
                    <Button onClick={handleEdit} variant="outline" className="flex items-center gap-2">
                        <Pencil size={16} />
                        <span>Edit Event</span>
                    </Button>
                )}

                {!isCancelled && (
                    <Button onClick={handleCancelInitiate} variant="outline" className="flex items-center gap-2 text-amber-600" isLoading={isCancelling}>
                        <Calendar size={16} />
                        <span>Cancel Event</span>
                    </Button>
                )}

                <Button onClick={handleDeleteInitiate} variant="outline" className="flex items-center gap-2 text-rose-600" isLoading={isDeleting}>
                    <Trash2 size={16} />
                    <span>Delete Event</span>
                </Button>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 bg-rose-100 dark:bg-rose-900/30 p-2 rounded-full">
                                <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                            </div>
                            <div className="flex-grow">
                                <h3 className="text-lg font-medium text-slate-900 dark:text-white">Confirm Event Deletion</h3>
                                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                                    Are you sure you want to delete the event "{event.title}"? This action cannot be undone.
                                </p>
                                {deleteError && (<p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{deleteError}</p>)}
                                <div className="mt-4 flex justify-end gap-3">
                                    <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>Cancel</Button>
                                    <Button variant="danger" onClick={handleDeleteConfirm} isLoading={isDeleting}>Delete</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Event Confirmation Modal */}
            {showCancelConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full">
                                <Calendar className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="flex-grow">
                                <h3 className="text-lg font-medium text-slate-900 dark:text-white">Cancel Event</h3>
                                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                                    Are you sure you want to cancel the event "{event.title}"? This will notify all participants and mark the event as cancelled.
                                </p>
                                <div className="mt-3">
                                    <label htmlFor="cancellation-reason" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Reason for cancellation (optional)
                                    </label>
                                    <textarea id="cancellation-reason" value={cancellationReason} onChange={(e) => setCancellationReason(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-white"
                                        rows={3} placeholder="Let participants know why the event is being cancelled..." />
                                </div>
                                {cancelError && (<p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{cancelError}</p>)}
                                <div className="mt-4 flex justify-end gap-3">
                                    <Button variant="outline" onClick={() => setShowCancelConfirm(false)} disabled={isCancelling}>Back</Button>
                                    <Button variant="danger" onClick={handleCancelConfirm} isLoading={isCancelling}>Cancel Event</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Invite Participants Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-lg w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                                Invite Participants to "{event.title}"
                            </h3>
                            <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={inviteFormMethods.handleSubmit(handleInviteSubmit)}>
                            <EventParticipantInviteField
                                control={inviteFormMethods.control}
                                name="invited_emails"
                                error={inviteFormMethods.formState.errors.invited_emails}
                            />
                            <div className="mt-6 flex justify-end gap-3">
                                <Button type="button" variant="outline" onClick={() => setShowInviteModal(false)} disabled={isInviting}>Cancel</Button>
                                <Button type="submit" variant="primary" isLoading={isInviting}>Send Invitations</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Manage Participants Modal - *** מודאל חדש ומעודכן *** */}
            {showManageParticipantsModal && (
                <div className="fixed inset-0 bg-black bg-opacity50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-lg w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                                Manage Participants for "{event.title}"
                            </h3>
                            <button onClick={() => setShowManageParticipantsModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <X size={24} />
                            </button>
                        </div>
                        {isLoadingParticipants ? (
                            <p className="text-center text-slate-500">Loading participants...</p>
                        ) : (
                            <ul className="divide-y divide-slate-200 dark:divide-slate-700 max-h-96 overflow-y-auto">
                                {eventParticipants.length === 0 ? (
                                    <li className="py-2 text-slate-500">No participants yet.</li>
                                ) : (
                                    eventParticipants.map(participant => (
                                        <li key={participant.db_id} className="flex justify-between items-center py-2">
                                            <div className="flex items-center gap-2">
                                                {/* לוגיקת תצוגת אייקון/תמונה */}
                                                {participant.avatar_url && participant.type === 'registered' ? (
                                                    <img src={participant.avatar_url} alt={participant.display} className="w-8 h-8 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                                        <User size={18} />
                                                    </div>
                                                )}
                                                <span className="text-slate-700 dark:text-slate-300 flex flex-col">
                                                    <span>{participant.display}</span>
                                                    {participant.status && participant.type === 'registered' && (
                                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                                            {participant.status.charAt(0).toUpperCase() + participant.status.slice(1)}
                                                        </span>
                                                    )}
                                                    {participant.type === 'guest' && (
                                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                                            {participant.status === 'invited' ? 'Invited' : participant.status?.charAt(0).toUpperCase() + participant.status?.slice(1)}
                                                            {participant.email && ` (${participant.email})`}
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => handleRemoveParticipant(participant)} isLoading={isRemovingParticipant} className="text-rose-600 hover:text-rose-800">
                                                <Trash2 size={16} />
                                            </Button>
                                        </li>
                                    ))
                                )}
                            </ul>
                        )}
                        <div className="mt-6 flex justify-end">
                            <Button type="button" variant="outline" onClick={() => setShowManageParticipantsModal(false)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default EventAdminActions;