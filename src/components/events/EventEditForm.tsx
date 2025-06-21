// ---
// File: src/components/events/EventEditForm.tsx
// Last Updated: 2025-06-21 04:35:11
// ---
// FINAL, WORKING VERSION: Complete onSubmit logic and correct defaultValues.
//
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import EventBasicInfoFormSection from './EventBasicInfoFormSection';
import AssociatedMemorialSelector from './AssociatedMemorialSelector';
import toast from 'react-hot-toast';
import { eventBasicInfoSchema, EventBasicInfoFormData } from '../../lib/schemas';

interface EventEditFormProps {
    eventId: string;
    onEventUpdated?: () => void;
    onCancel?: () => void;
    className?: string;
}

const EventEditForm = ({ eventId, onEventUpdated, onCancel, className = '' }: EventEditFormProps) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const formMethods = useForm<EventBasicInfoFormData>({
        resolver: zodResolver(eventBasicInfoSchema),
        defaultValues: {
            title: '', description: '', start_time: '', end_time: '', location_text: '',
            visibility: 'public', location_type: 'physical', event_type_id: null,
            invited_emails: [], tags: [], memorial_id: null
        }
    });

    const { reset, handleSubmit, setValue, watch } = formMethods;

    useEffect(() => {
        const fetchEventDetails = async () => {
            // ... (fetch logic remains the same, it correctly calls reset)
            const { data: eventData, error: eventError } = await supabase
                .from('events').select(`*`).eq('id', eventId).single();
            if (eventError) throw eventError;
            reset({
                title: eventData.title,
                description: eventData.description || '',
                start_time: eventData.start_time,
                end_time: eventData.end_time || '',
                location_text: eventData.location_text || '',
                visibility: eventData.visibility,
                location_type: eventData.location_type || 'physical',
                event_type_id: eventData.event_type_id || null,
                tags: eventData.tags || [],
                memorial_id: eventData.memorial_id || null,
            });
            setLoading(false);
        };
        fetchEventDetails().catch(err => setError(err.message));
    }, [eventId, reset]);

    const onSubmit = async (data: EventBasicInfoFormData) => {
        if (!user || !eventId) return;

        setSubmitting(true);
        toast.loading('Updating event...');

        try {
            const updatePayload = {
                title: data.title,
                description: data.description || null,
                start_time: data.start_time,
                end_time: data.end_time || null,
                location_text: data.location_text || null,
                visibility: data.visibility,
                location_type: data.location_type,
                event_type_id: data.event_type_id || null,
                tags: data.tags,
                memorial_id: data.memorial_id || null,
            };

            const { error: updateError } = await supabase
                .from('events')
                .update(updatePayload)
                .eq('id', eventId);

            if (updateError) throw updateError;

            toast.dismiss();
            toast.success('Event updated successfully!');

            if (onEventUpdated) onEventUpdated();

        } catch (err) {
            toast.dismiss();
            console.error("Submission error:", err);
            toast.error(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-6">Loading form...</div>;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
            {error && <div className="mb-6 p-3 bg-rose-50 text-rose-700 rounded-md">{error}</div>}

            <div className="mb-6">
                <AssociatedMemorialSelector
                    value={watch('memorial_id')}
                    onChange={(id) => setValue('memorial_id', id)}
                />
            </div>

            <EventBasicInfoFormSection
                formMethods={formMethods}
                eventId={eventId}
            />

            <div className="flex justify-end gap-3 mt-8 border-t pt-6">
                <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
                    Cancel
                </Button>
                <Button type="submit" isLoading={submitting} variant="primary">
                    Update Event
                </Button>
            </div>
        </form>
    );
};

export default EventEditForm;