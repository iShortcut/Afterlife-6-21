import { useState } from 'react';
import { Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import TextArea from '../ui/TextArea';
import Button from '../ui/Button';

interface ChatMessageInputProps {
  threadId: string;
  onMessageSent?: () => void;
  className?: string;
}

const ChatMessageInput = ({ threadId, onMessageSent, className = '' }: ChatMessageInputProps) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to send messages');
      return;
    }
    
    if (!threadId) {
      setError('No conversation selected');
      return;
    }
    
    if (!message.trim()) {
      return;
    }
    
    try {
      setSending(true);
      setError(null);
      
      const { error: sendError } = await supabase
        .from('chat_messages')
        .insert({
          thread_id: threadId,
          sender_id: user.id,
          content: message.trim()
        });
        
      if (sendError) throw sendError;
      
      setMessage('');
      if (onMessageSent) {
        onMessageSent();
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`p-4 border-t border-slate-100 ${className}`}>
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <TextArea
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          minRows={1}
          maxRows={4}
          className="flex-grow resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (message.trim()) {
                handleSendMessage(e);
              }
            }
          }}
          error={error || undefined}
        />
        <Button
          type="submit"
          disabled={!message.trim() || sending}
          isLoading={sending}
          className="self-end"
        >
          <Send size={18} />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  );
};

export default ChatMessageInput;