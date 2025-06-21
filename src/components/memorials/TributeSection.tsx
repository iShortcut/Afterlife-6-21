import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { User, MessageSquare, MoreVertical } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import TributeInputForm from '../tributes/TributeInputForm';
import ReportContentButton from '../moderation/ReportContentButton';
import toast from 'react-hot-toast';

interface TributeSectionProps {
  memorialId: string;
}

interface Author {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface Tribute {
  id: string;
  memorial_id: string;
  author_id: string | null;
  parent_tribute_id: string | null;
  content: string;
  type: string;
  created_at: string;
  updated_at: string;
  author: Author | null;
  replies?: Tribute[];
}

const TributeSection = ({ memorialId }: TributeSectionProps) => {
  const { user } = useAuth();
  const [tributes, setTributes] = useState<Tribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const fetchTributes = async () => {
    try {
      setLoading(true);

      // Fetch parent tributes first
      const { data: parentTributes, error: parentError } = await supabase
        .from('tributes')
        .select(`
          *,
          author:author_id (
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('memorial_id', memorialId)
        .is('parent_tribute_id', null)
        .order('created_at', { ascending: false });

      if (parentError) throw parentError;

      // Fetch replies for each parent tribute
      const tributesWithReplies = await Promise.all(
        (parentTributes || []).map(async (tribute) => {
          const { data: replies, error: repliesError } = await supabase
            .from('tributes')
            .select(`
              *,
              author:author_id (
                id,
                full_name,
                username,
                avatar_url
              )
            `)
            .eq('parent_tribute_id', tribute.id)
            .order('created_at', { ascending: true });

          if (repliesError) throw repliesError;

          return {
            ...tribute,
            replies: replies || []
          };
        })
      );

      setTributes(tributesWithReplies);
    } catch (err) {
      console.error('Error fetching tributes:', err);
      setError('Failed to load tributes');
      toast.error('Failed to load tributes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTributes();
    
    // Subscribe to new tributes and replies
    const channel = supabase
      .channel(`tributes-${memorialId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tributes',
          filter: `memorial_id=eq.${memorialId}`
        },
        () => {
          fetchTributes();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [memorialId]);

  const handleTributeSubmitted = () => {
    fetchTributes();
    setReplyingTo(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-slate-200 rounded-full" />
              <div className="flex-grow">
                <div className="h-4 bg-slate-200 rounded w-1/4 mb-2" />
                <div className="h-3 bg-slate-200 rounded w-1/6" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-4 bg-slate-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-serif text-slate-800">Tributes</h2>
      </div>

      {user && (
        <TributeInputForm
          memorialId={memorialId}
          onSuccess={handleTributeSubmitted}
          className="mb-6"
        />
      )}

      {tributes.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg">
          <MessageSquare className="mx-auto h-12 w-12 text-slate-300 mb-2" />
          <p className="text-slate-600">No tributes yet. Be the first to share a memory.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {tributes.map(tribute => (
            <div key={tribute.id} className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  {tribute.author?.avatar_url ? (
                    <img
                      src={tribute.author.avatar_url}
                      alt={tribute.author.full_name || 'User'}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <User size={20} className="text-indigo-500" />
                    </div>
                  )}
                </div>

                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-slate-800">
                      {tribute.author?.full_name || tribute.author?.username || 'Anonymous'}
                    </h4>
                    
                    <div className="flex items-center gap-2">
                      <time className="text-xs text-slate-500">
                        {format(new Date(tribute.created_at), 'MMM d, yyyy')}
                      </time>
                      
                      {user && (
                        <div className="relative">
                          <button
                            onClick={() => setActiveMenu(activeMenu === tribute.id ? null : tribute.id)}
                            className="p-1 rounded-full hover:bg-slate-100"
                          >
                            <MoreVertical size={16} className="text-slate-500" />
                          </button>
                          
                          {activeMenu === tribute.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 py-1">
                              <ReportContentButton
                                contentType="TRIBUTE"
                                contentId={tribute.id}
                                reportedUserId={tribute.author?.id}
                                variant="menu-item"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="mt-1 text-slate-700 whitespace-pre-line">{tribute.content}</p>

                  {user && (
                    <button
                      onClick={() => setReplyingTo(replyingTo === tribute.id ? null : tribute.id)}
                      className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      {replyingTo === tribute.id ? 'Cancel reply' : 'Reply'}
                    </button>
                  )}

                  {replyingTo === tribute.id && (
                    <div className="mt-3">
                      <TributeInputForm
                        memorialId={memorialId}
                        parentId={tribute.id}
                        onSuccess={handleTributeSubmitted}
                        onCancel={() => setReplyingTo(null)}
                        placeholder="Write a reply..."
                      />
                    </div>
                  )}

                  {tribute.replies && tribute.replies.length > 0 && (
                    <div className="mt-4 space-y-4 pl-4 border-l-2 border-slate-100">
                      {tribute.replies.map(reply => (
                        <div key={reply.id} className="flex gap-3">
                          <div className="flex-shrink-0">
                            {reply.author?.avatar_url ? (
                              <img
                                src={reply.author.avatar_url}
                                alt={reply.author.full_name || 'User'}
                                className="w-8 h-8 rounded-full"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                <User size={16} className="text-indigo-500" />
                              </div>
                            )}
                          </div>

                          <div className="flex-grow">
                            <div className="flex justify-between items-start">
                              <h4 className="font-medium text-sm text-slate-800">
                                {reply.author?.full_name || reply.author?.username || 'Anonymous'}
                              </h4>
                              
                              <div className="flex items-center gap-2">
                                <time className="text-xs text-slate-500">
                                  {format(new Date(reply.created_at), 'MMM d, yyyy')}
                                </time>
                                
                                {user && (
                                  <div className="relative">
                                    <button
                                      onClick={() => setActiveMenu(activeMenu === reply.id ? null : reply.id)}
                                      className="p-1 rounded-full hover:bg-slate-100"
                                    >
                                      <MoreVertical size={14} className="text-slate-500" />
                                    </button>
                                    
                                    {activeMenu === reply.id && (
                                      <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 py-1">
                                        <ReportContentButton
                                          contentType="TRIBUTE"
                                          contentId={reply.id}
                                          reportedUserId={reply.author?.id}
                                          variant="menu-item"
                                        />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <p className="mt-1 text-sm text-slate-700 whitespace-pre-line">
                              {reply.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TributeSection;