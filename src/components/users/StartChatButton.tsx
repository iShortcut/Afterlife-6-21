import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface StartChatButtonProps {
  userId: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'outline';
  className?: string;
}

const StartChatButton = ({ 
  userId, 
  size = 'sm', 
  variant = 'outline',
  className = '' 
}: StartChatButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleStartChat = async () => {
    if (!user) {
      toast.error('Please sign in to start a conversation');
      return;
    }

    if (user.id === userId) {
      toast.error('You cannot start a chat with yourself');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('get_or_create_dm_thread', {
        body: { user_id: user.id, other_user_id: userId }
      });

      if (error) {
        if (error.message.includes('BLOCKED')) {
          toast.error('Unable to start conversation');
        } else {
          throw error;
        }
        return;
      }

      if (!data?.thread_id) {
        throw new Error('No thread ID received');
      }

      // Navigate to the chat with this thread
      navigate(`/chat?thread=${data.thread_id}`);
      
      if (data.is_new) {
        toast.success('Chat started');
      }

    } catch (err) {
      console.error('Error starting chat:', err);
      toast.error('Failed to start conversation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleStartChat}
      variant={variant}
      size={size}
      isLoading={loading}
      className={`flex items-center gap-2 ${className}`}
    >
      <MessageSquare size={size === 'sm' ? 16 : 18} />
      <span>Message</span>
    </Button>
  );
};

export default StartChatButton;