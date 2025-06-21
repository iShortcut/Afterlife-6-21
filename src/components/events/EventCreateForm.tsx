// ---
// File: src/components/events/EventCreateForm.tsx
// Last Updated: 2025-06-21 04:35:11
// ---
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import EventBasicInfoFormSection from './EventBasicInfoFormSection';
import AssociatedMemorialSelector from './AssociatedMemorialSelector';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { eventBasicInfoSchema, type EventBasicInfoFormData } from '../../lib/schemas';

interface EventCreateFormProps {
    memorialId?: string;
    onEventCreated?: (newEventId: string) => void;
    className?: string;
}

export const EventCreateForm = ({ memorialId, onEventCreated, className = '' }: EventCreateFormProps) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDraft, setIsDraft] = useState(false);

    const formMethods = useForm<EventBasicInfoFormData>({
        resolver: zodResolver(eventBasicInfoSchema),
        defaultValues: {
            title: '',
            description: '',
            start_time: '',
            end_time: '',
            location_text: '',
            visibility: 'public',
            location_type: 'physical',
            event_type_id: null,
            invited_emails: [],
            tags: [],
            memorial_id: memorialId || null
        }
    });

    const { handleSubmit, reset, watch } = formMethods;
    const selectedMemorialId = watch('memorial_id');

    const onSubmit = async (data: EventBasicInfoFormData) => {
        if (!user) return;

        setIsSubmitting(true);
        const status = isDraft ? 'draft' : 'published';
        toast.loading(status === 'draft' ? 'Saving draft...' : 'Publishing event...');

        try {
            const { data: newEvent, error: insertError } = await supabase
                .from('events')
                .insert({
                    title: data.title.trim(),
                    description: data.description?.trim() || null,
                    start_time: data.start_time,
                    end_time: data.end_time || null,
                    location_text: data.location_text?.trim() || null,
                    location_type: data.location_type,
                    visibility: data.visibility,
                    creator_id: user.id,
                    memorial_id: selectedMemorialId,
                    event_type_id: data.event_type_id,
                    status: status,
                    tags: data.tags
                })
                .select()
                .single();

            if (insertError) throw insertError;

            toast.dismiss();
            toast.success(status === 'draft' ? 'Event draft saved!' : 'Event created successfully!');

            if (onEventCreated) {
                onEventCreated(newEvent.id);
            } else {
                navigate(`/events/${newEvent.id}`);
            }

        } catch (err) {
            toast.dismiss();
            toast.error(err instanceof Error ? err.message : 'Failed to create event');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center"><Calendar className="text-indigo-600" size={20} /></div>
                <div>
                    <h2 className="text-xl font-medium text-slate-800">Create New Event</h2>
                    <p className="text-sm text-slate-500">Fill in the details to create your event</p>
                </div>
            </div>

            <div className="mb-6">
                <AssociatedMemorialSelector
                    value={selectedMemorialId}
                    onChange={(id) => formMethods.setValue('memorial_id', id)}
                    disabled={!!memorialId}
                />
            </div>

            <EventBasicInfoFormSection formMethods={formMethods} eventId={null} />

            <div className="flex justify-end gap-3 mt-8">
                <Button type="submit" variant="outline" onClick={() => setIsDraft(true)} disabled={isSubmitting}>
                    Save as Draft
                </Button>
                <Button type="submit" isLoading={isSubmitting && !isDraft} onClick={() => setIsDraft(false)}>
                    Publish Event
                </Button>
            </div>
        </form>
    );
};

export default EventCreateForm;