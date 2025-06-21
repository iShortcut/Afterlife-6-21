import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { User, Search, MessageCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Input from '../ui/Input';

interface ChatParticipant {
  user_id: string;
  thread_id: string;
  last_read_at: string | null;
}

interface ChatThread {
  id: string;
  created_at: string;
  updated_at: string;
  title: string | null;
  is_group: boolean;
  participants: ChatParticipant[];
  otherParticipant?: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  lastMessage?: {
    content: string;
    created_at: string;
  };
  unread: boolean;
}

interface ChatSidebarProps {
  onSelectThread: (threadId: string) => void;
  selectedThreadId?: string;
  className?: string;
}

const ChatSidebar = ({ onSelectThread, selectedThreadId, className = '' }: ChatSidebarProps) => {
  const { user } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchChatThreads = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch threads with participants
      const { data: threadData, error: threadError } = await supabase
        .from('chat_threads')
        .select(`
          *,
          participants:chat_participants!inner(user_id, last_read_at)
        `)
        .order('updated_at', { ascending: false });

      if (threadError) throw threadError;

      // Filter threads where the current user is a participant
      const userThreads = (threadData || []).filter(thread => 
        thread.participants.some(p => p.user_id === user.id)
      );

      // For each thread, fetch the other participant's details (for DMs)
      const threadsWithDetails = await Promise.all(
        userThreads.map(async thread => {
          // For DMs, get the other participant's profile
          if (!thread.is_group) {
            const otherParticipantId = thread.participants
              .find(p => p.user_id !== user.id)?.user_id;

            if (otherParticipantId) {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('id, full_name, username, avatar_url')
                .eq('id', otherParticipantId)
                .single();

              thread.otherParticipant = profileData || undefined;
            }
          }

          // Get the last message in the thread
          const { data: messageData } = await supabase
            .from('chat_messages')
            .select('content, created_at')
            .eq('thread_id', thread.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (messageData) {
            thread.lastMessage = messageData;
          }

          // Check if there are unread messages
          const userParticipant = thread.participants.find(p => p.user_id === user.id);
          const lastReadAt = userParticipant?.last_read_at ? new Date(userParticipant.last_read_at) : null;
          const threadUpdatedAt = new Date(thread.updated_at);
          
          thread.unread = lastReadAt === null || threadUpdatedAt > lastReadAt;

          return thread;
        })
      );

      setThreads(threadsWithDetails);
    } catch (err) {
      console.error('Error fetching chat threads:', err);
      setError('Failed to load chat threads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChatThreads();
    
    // Subscribe to changes in chat_threads and chat_messages
    if (user) {
      const threadsChannel = supabase
        .channel('chat-threads-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_threads'
          },
          () => {
            fetchChatThreads();
          }
        )
        .subscribe();

      const messagesChannel = supabase
        .channel('chat-messages-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages'
          },
          () => {
            fetchChatThreads();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(threadsChannel);
        supabase.removeChannel(messagesChannel);
      };
    }
  }, [user]);

  const filteredThreads = threads.filter(thread => {
    if (!searchQuery) return true;
    
    const otherParticipantName = thread.otherParticipant?.full_name || thread.otherParticipant?.username || '';
    const threadTitle = thread.title || '';
    
    return (
      otherParticipantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      threadTitle.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleThreadClick = (threadId: string) => {
    onSelectThread(threadId);
    
    // Mark thread as read when selected
    if (user) {
      supabase
        .from('chat_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('thread_id', threadId)
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) console.error('Error updating last_read_at:', error);
        });
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm ${className}`}>
        <div className="p-3 border-b border-slate-100">
          <div className="animate-pulse h-10 bg-slate-200 rounded-md" />
        </div>
        <div className="p-2 space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse p-3 rounded-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 rounded-full" />
                <div className="flex-grow">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm h-full flex flex-col ${className}`}>
      {/* Search Bar */}
      <div className="p-3 border-b border-slate-100">
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search size={18} className="text-slate-400" aria-hidden="true" />}
          aria-label="Search conversations"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 text-rose-600 text-sm" role="alert">
          {error}
        </div>
      )}

      {/* Thread List */}
      <div className="flex-grow overflow-y-auto">
        {filteredThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center text-slate-500">
            <MessageCircle size={32} className="text-slate-300 mb-2" aria-hidden="true" />
            {searchQuery ? (
              <p>No conversations match your search</p>
            ) : (
              <p>No conversations yet</p>
            )}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredThreads.map(thread => (
              <button
                key={thread.id}
                onClick={() => handleThreadClick(thread.id)}
                className={`
                  w-full p-3 rounded-md cursor-pointer transition-colors text-left
                  ${selectedThreadId === thread.id ? 'bg-indigo-50' : 'hover:bg-slate-50'}
                  ${thread.unread ? 'bg-indigo-50/50' : ''}
                `}
                aria-selected={selectedThreadId === thread.id}
                aria-label={`Conversation with ${thread.is_group ? thread.title || 'Group' : thread.otherParticipant?.full_name || thread.otherParticipant?.username || 'Unknown User'}`}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  {thread.is_group ? (
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <MessageCircle size={20} className="text-indigo-500" aria-hidden="true" />
                    </div>
                  ) : thread.otherParticipant?.avatar_url ? (
                    <img
                      src={thread.otherParticipant.avatar_url}
                      alt={thread.otherParticipant.full_name || 'User'}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <User size={20} className="text-indigo-500" aria-hidden="true" />
                    </div>
                  )}

                  {/* Thread info */}
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-center">
                      <h3 className={`font-medium text-sm truncate ${thread.unread ? 'text-indigo-900' : 'text-slate-800'}`}>
                        {thread.is_group 
                          ? thread.title || 'Group Chat'
                          : thread.otherParticipant?.full_name || thread.otherParticipant?.username || 'Unknown User'
                        }
                      </h3>
                      {thread.lastMessage && (
                        <span className="text-xs text-slate-500">
                          {format(new Date(thread.lastMessage.created_at), 'h:mm a')}
                        </span>
                      )}
                    </div>
                    
                    {thread.lastMessage && (
                      <p className={`text-xs truncate ${thread.unread ? 'text-indigo-700 font-medium' : 'text-slate-500'}`}>
                        {thread.lastMessage.content}
                      </p>
                    )}
                  </div>

                  {/* Unread indicator */}
                  {thread.unread && (
                    <div className="w-2 h-2 rounded-full bg-indigo-600 flex-shrink-0" aria-label="Unread messages" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;