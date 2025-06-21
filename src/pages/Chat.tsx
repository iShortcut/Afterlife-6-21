import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatPanel from '../components/chat/ChatPanel';
import Button from '../components/ui/Button';
import NewChatModal from '../components/chat/NewChatModal';

const Chat = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>(undefined);
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  // Check for thread parameter in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const threadId = params.get('thread');
    
    if (threadId) {
      setSelectedThreadId(threadId);
      // Clean up URL after getting the thread ID
      navigate('/chat', { replace: true });
    }
  }, [location, navigate]);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
          <MessageCircle size={48} className="mx-auto text-indigo-300 mb-4" aria-hidden="true" />
          <h2 className="text-2xl font-serif text-slate-800 mb-4">Sign in to Chat</h2>
          <p className="text-slate-600 mb-6">
            Please sign in to access your conversations and connect with others.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-serif text-slate-800">Messages</h1>
          <Button
            onClick={() => setShowNewChatModal(true)}
            className="flex items-center gap-2"
            aria-label="Start new conversation"
          >
            <Plus size={18} aria-hidden="true" />
            <span>New Message</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          <div className="md:col-span-1">
            <ChatSidebar
              onSelectThread={setSelectedThreadId}
              selectedThreadId={selectedThreadId}
            />
          </div>
          <div className="md:col-span-2">
            <ChatPanel
              threadId={selectedThreadId || ''}
              className="h-full"
            />
          </div>
        </div>
      </motion.div>

      {showNewChatModal && (
        <NewChatModal
          onClose={() => setShowNewChatModal(false)}
          onThreadCreated={(threadId) => {
            setSelectedThreadId(threadId);
            setShowNewChatModal(false);
          }}
        />
      )}
    </div>
  );
};

export default Chat;