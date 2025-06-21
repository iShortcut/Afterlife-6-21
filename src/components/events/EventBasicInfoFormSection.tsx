import { UseFormReturn, Controller, FieldError } from 'react-hook-form';
import { eventBasicInfoSchema, EventBasicInfoFormData } from '../../lib/schemas';
import EventTypeSelect from './EventTypeSelect';
import EventCoverImageUpload from './EventCoverImageUpload';
import EventVisibilitySelector from './EventVisibilitySelector';
import EventLocationTypeSelector from './EventLocationTypeSelector';
import EventParticipantInviteField from './EventParticipantInviteField';
import EventLocationPicker from './EventLocationPicker';
import EventTagsInput from './EventTagsInput';
import DateTimePicker from './DateTimePicker';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';

interface EventBasicInfoFormSectionProps {
  formMethods: UseFormReturn<EventBasicInfoFormData>;
  eventId: string | null;
}

const EventBasicInfoFormSection = ({ formMethods, eventId }: EventBasicInfoFormSectionProps) => {
  // We get all methods, including setValue, from the formMethods prop
  const { register, formState: { errors }, control, watch, setValue } = formMethods;
  const locationType = watch('location_type');

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">Event Title*</label>
        <Input id="title" {...register('title')} placeholder="Enter event title" error={errors.title?.message} required />
      </div>
      <EventTypeSelect control={control} name="event_type_id" error={errors.event_type_id as FieldError | undefined} required />
      <EventCoverImageUpload control={control} name="cover_image_file" error={errors.cover_image_file?.message as string | undefined} />
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
        <TextArea id="description" {...register('description')} placeholder="Enter event description" minRows={4} error={errors.description?.message} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Controller name="start_time" control={control} render={({ field }) => (<DateTimePicker label="Start Date and Time*" value={field.value} onChange={field.onChange} error={errors.start_time?.message} required minDate={new Date()} />)} />
        <Controller name="end_time" control={control} render={({ field }) => (<DateTimePicker label="End Date and Time (optional)" value={field.value} onChange={field.onChange} error={errors.end_time?.message} minDate={watch('start_time') ? new Date(watch('start_time')) : new Date()} />)} />
      </div>
      <EventLocationTypeSelector control={control} name="location_type" />
      
      {/* --- THIS IS THE FIX --- */}
      {/* Pass the 'setValue' function down to the child component */}
      <EventLocationPicker 
        control={control} 
        setValue={setValue} 
        name="location_text" 
        error={errors.location_text} 
        required 
        locationType={locationType} 
      />
      
      <EventTagsInput control={control} name="tags" error={errors.tags as FieldError | undefined} placeholder="Add tags (e.g., memorial, family, celebration)" />
      <EventVisibilitySelector control={control} name="visibility" />
      <EventParticipantInviteField control={control} name="invited_emails" error={errors.invited_emails as FieldError | undefined} eventId={eventId} />
    </div>
  );
};

export default EventBasicInfoFormSection;