import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { User, ArrowDown, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import ChatMessageInput from './ChatMessageInput';

interface ChatMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

interface ChatPanelProps {
  threadId: string;
  className?: string;
}

const MESSAGES_PER_PAGE = 20;

const ChatPanel = ({ threadId, className = '' }: ChatPanelProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [threadTitle, setThreadTitle] = useState<string | null>(null);
  const [otherParticipant, setOtherParticipant] = useState<{
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const fetchThreadDetails = async () => {
    if (!user || !threadId) return;

    try {
      // Fetch thread details
      const { data: threadData, error: threadError } = await supabase
        .from('chat_threads')
        .select(`
          *,
          participants:chat_participants(user_id)
        `)
        .eq('id', threadId)
        .single();

      if (threadError) throw threadError;

      setThreadTitle(threadData.title);

      // If it's a DM, get the other participant's details
      if (!threadData.is_group) {
        const otherParticipantId = threadData.participants
          .find((p: any) => p.user_id !== user.id)?.user_id;

        if (otherParticipantId) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url')
            .eq('id', otherParticipantId)
            .single();

          if (profileError) throw profileError;
          setOtherParticipant(profileData);
        }
      }
    } catch (err) {
      console.error('Error fetching thread details:', err);
      setError('Failed to load conversation details');
    }
  };

  const fetchMessages = async (isInitial = true) => {
    if (!user || !threadId) return;

    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      // Calculate the range for pagination
      const from = isInitial ? 0 : messages.length;
      const to = from + MESSAGES_PER_PAGE - 1;

      // Fetch messages with pagination
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:sender_id (
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (messagesError) throw messagesError;
      
      // Check if we have more messages to load
      setHasMoreMessages(messagesData.length === MESSAGES_PER_PAGE);
      
      // Add messages to state (in correct order)
      const newMessages = messagesData.reverse();
      
      if (isInitial) {
        setMessages(newMessages);
      } else {
        // For loading more (older) messages, we add them to the beginning
        setMessages(prev => [...newMessages, ...prev]);
      }

      // Mark thread as read if this is the initial load
      if (isInitial) {
        markThreadAsRead();
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages');
    } finally {
      if (isInitial) {
        setLoading(false);
        // Scroll to bottom after initial messages load
        setTimeout(() => scrollToBottom(), 100);
      } else {
        setLoadingMore(false);
      }
    }
  };

  const markThreadAsRead = async () => {
    if (!user || !threadId) return;
    
    try {
      const { error: updateError } = await supabase
        .from('chat_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('thread_id', threadId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating last_read_at:', updateError);
      }
    } catch (err) {
      console.error('Error marking thread as read:', err);
    }
  };

  useEffect(() => {
    // Reset state when thread changes
    setMessages([]);
    setHasMoreMessages(true);
    setError(null);
    
    if (threadId) {
      fetchThreadDetails();
      fetchMessages(true);
    }

    // Subscribe to new messages
    if (threadId) {
      const messagesChannel = supabase
        .channel(`chat-messages-${threadId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `thread_id=eq.${threadId}`
          },
          (payload) => {
            // Fetch the sender details for the new message
            supabase
              .from('profiles')
              .select('id, full_name, username, avatar_url')
              .eq('id', payload.new.sender_id)
              .single()
              .then(({ data: senderData }) => {
                const newMessage = {
                  ...payload.new,
                  sender: senderData
                } as ChatMessage;
                
                setMessages(prev => [...prev, newMessage]);
                
                // Mark as read if we're actively viewing this thread
                // and the message is not from the current user
                if (user && user.id !== payload.new.sender_id) {
                  markThreadAsRead();
                }
                
                // Scroll to bottom when new message arrives
                // if we're already near the bottom
                const container = messagesContainerRef.current;
                if (container) {
                  const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
                  if (isNearBottom) {
                    scrollToBottom();
                  } else {
                    setShowScrollButton(true);
                  }
                }
              });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messagesChannel);
      };
    }
  }, [threadId, user]);

  // Add scroll event listener to show/hide scroll button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const loadMoreMessages = () => {
    if (hasMoreMessages && !loadingMore) {
      fetchMessages(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollButton(false);
  };

  const handleMessageSent = () => {
    // Scroll to bottom when a message is sent
    setTimeout(() => scrollToBottom(), 100);
  };

  if (!threadId) {
    return (
      <div className={`bg-white rounded-lg shadow-sm flex items-center justify-center ${className}`}>
        <div className="text-center p-8 text-slate-500">
          Select a conversation to start chatting
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm flex flex-col h-full ${className}`}>
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-100 flex items-center gap-3">
        {otherParticipant ? (
          <>
            {otherParticipant.avatar_url ? (
              <img
                src={otherParticipant.avatar_url}
                alt={otherParticipant.full_name || 'User'}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <User size={20} className="text-indigo-500" aria-hidden="true" />
              </div>
            )}
            <div>
              <h3 className="font-medium text-slate-800">
                {otherParticipant.full_name || otherParticipant.username || 'Unknown User'}
              </h3>
            </div>
          </>
        ) : (
          <h3 className="font-medium text-slate-800">
            {threadTitle || 'Chat'}
          </h3>
        )}
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-grow overflow-y-auto p-4 space-y-4 relative"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {/* Load More Button */}
        {hasMoreMessages && !loading && (
          <div className="flex justify-center mb-4">
            <Button
              onClick={loadMoreMessages}
              variant="outline"
              size="sm"
              disabled={loadingMore}
              isLoading={loadingMore}
            >
              {loadingMore ? 'Loading...' : 'Load older messages'}
            </Button>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="w-8 h-8 bg-slate-200 rounded-full" />
                <div className="flex-grow">
                  <div className="h-4 bg-slate-200 rounded w-1/4 mb-1" />
                  <div className="h-10 bg-slate-200 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-4 text-rose-600 text-center" role="alert">
            {error}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message, index) => {
            const isCurrentUser = message.sender_id === user?.id;
            const showAvatar = index === 0 || messages[index - 1].sender_id !== message.sender_id;
            
            return (
              <div
                key={message.id}
                className={`flex items-start gap-2 ${isCurrentUser ? 'justify-end' : ''}`}
              >
                {!isCurrentUser && showAvatar && (
                  <div className="flex-shrink-0 mt-1">
                    {message.sender?.avatar_url ? (
                      <img
                        src={message.sender.avatar_url}
                        alt={message.sender.full_name || 'User'}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                        <User size={16} className="text-indigo-500" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                )}
                
                {!isCurrentUser && !showAvatar && <div className="w-8" />}
                
                <div className={`max-w-[70%] ${isCurrentUser ? 'order-1' : 'order-2'}`}>
                  {showAvatar && !isCurrentUser && (
                    <div className="text-xs text-slate-500 mb-1 ml-1">
                      {message.sender?.full_name || message.sender?.username || 'Unknown'}
                    </div>
                  )}
                  
                  <div className={`
                    px-3 py-2 rounded-lg
                    ${isCurrentUser 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-slate-100 text-slate-800 rounded-tl-none'
                    }
                  `}>
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                  
                  <div className={`text-xs text-slate-500 mt-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                    {format(new Date(message.created_at), 'h:mm a')}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 p-2 bg-indigo-600 text-white rounded-full shadow-md hover:bg-indigo-700 transition-colors"
            aria-label="Scroll to bottom"
          >
            <ArrowDown size={20} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Message Input */}
      <ChatMessageInput 
        threadId={threadId} 
        onMessageSent={handleMessageSent} 
      />
    </div>
  );
};

export default ChatPanel;