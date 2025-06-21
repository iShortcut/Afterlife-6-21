import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import { X } from 'lucide-react';
import EventParticipantInviteField from './EventParticipantInviteField'; // Re-using our master component

// Define schema and types, consistent with EventAdminActions
const inviteSchema = z.object({
  invited_emails: z.array(z.string().email()).min(1, 'Please add at least one email address.'),
});
type InviteFormData = z.infer<typeof inviteSchema>;

interface SimpleInviteModalProps {
  eventId: string;
  eventTitle: string;
  onClose: () => void;
  onInvitesSent: () => void;
}

const SimpleInviteModal: React.FC<SimpleInviteModalProps> = ({ eventId, eventTitle, onClose, onInvitesSent }) => {
  const [isSending, setIsSending] = useState(false);

  // Use React Hook Form to manage the invite list
  const { control, handleSubmit, reset, formState: { errors } } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { invited_emails: [] },
  });

  const handleSendInvites = async (data: InviteFormData) => {
    setIsSending(true);
    toast.loading('Sending invitations...');

    const invitees = data.invited_emails.map(email => ({ email }));

    try {
      const { data: responseData, error } = await supabase.functions.invoke('handle-event-invitations', {
        body: { event_id: eventId, invitees },
      });

      toast.dismiss();
      if (error) throw error;

      toast.success(responseData.message || "Invitations processed successfully.", { duration: 6000 });
      onInvitesSent();
      onClose();

    } catch (err: any) {
      toast.dismiss();
      console.error("Invitation error:", err);
      toast.error(err.data?.error?.message || 'Failed to send invitations.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold">Invite Participants to "{eventTitle}"</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-300">
            <X size={24} />
          </button>
        </div>
        {/* The form now wraps our reusable component */}
        <form onSubmit={handleSubmit(handleSendInvites)}>
          <div className="p-4">
            <EventParticipantInviteField
              control={control}
              name="invited_emails"
              error={errors.invited_emails}
              label="Add emails or upload a CSV file"
              placeholder="Add emails one by one..."
            />
          </div>
          <div className="flex justify-end gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-b-lg">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSending}>Cancel</Button>
            <Button type="submit" isLoading={isSending}>Send Invites</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SimpleInviteModal;