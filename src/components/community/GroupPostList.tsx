import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { User, MessageSquare, MoreVertical, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface GroupPost {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  media_ids: string[] | null;
  group_id: string;
  status: string;
  visibility: string;
  author?: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  media?: Array<{
    id: string;
    storage_path: string;
    public_url: string;
  }>;
}

interface GroupPostListProps {
  groupId: string;
  className?: string;
}

const GroupPostList = ({ groupId, className = '' }: GroupPostListProps) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isGroupModerator, setIsGroupModerator] = useState(false);

  const fetchPosts = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Check if user is a moderator or admin
      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();

      if (!memberError) {
        setIsGroupModerator(['ADMIN', 'MODERATOR'].includes(memberData?.role || ''));
      }

      // Fetch posts from the posts table with group_id filter
      // Fix: Use proper join syntax for profiles table
      const { data, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles!inner (
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('group_id', groupId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Get media for posts
      const postsWithMedia = await Promise.all((data || []).map(async (post) => {
        if (post.media_ids && post.media_ids.length > 0) {
          const { data: mediaData, error: mediaError } = await supabase
            .from('media')
            .select('id, storage_path')
            .in('id', post.media_ids);

          if (mediaError) throw mediaError;

          const mediaWithUrls = mediaData?.map(media => {
            const { data: urlData } = supabase.storage
              .from('media')
              .getPublicUrl(media.storage_path);

            return {
              ...media,
              public_url: urlData.publicUrl
            };
          });

          return {
            ...post,
            media: mediaWithUrls
          };
        }

        return post;
      }));

      setPosts(postsWithMedia);
    } catch (err) {
      console.error('Error fetching group posts:', err);
      setError('Failed to load posts');
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();

    // Subscribe to changes
    const channel = supabase
      .channel(`group-${groupId}-posts`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: `group_id=eq.${groupId}`
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, user]);

  const handleDeletePost = async (postId: string) => {
    if (!user) return;

    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      setPosts(prev => prev.filter(post => post.id !== postId));
      toast.success('Post deleted successfully');
    } catch (err) {
      console.error('Error deleting post:', err);
      toast.error('Failed to delete post');
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
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

  if (error) {
    return (
      <div className={`bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg ${className}`}>
        {error}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-8 text-center ${className}`}>
        <MessageSquare className="mx-auto h-12 w-12 text-slate-300 mb-2" />
        <p className="text-slate-600 mb-2">No posts in this group yet</p>
        <p className="text-sm text-slate-500">Be the first to share something!</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {posts.map(post => (
        <div key={post.id} className="bg-white rounded-lg shadow-sm">
          <div className="p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0">
                {post.author?.avatar_url ? (
                  <img
                    src={post.author.avatar_url}
                    alt={post.author.full_name || 'User'}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <User size={20} className="text-indigo-500" />
                  </div>
                )}
              </div>
              
              <div className="flex-grow">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-slate-800">
                    {post.author?.full_name || post.author?.username || 'Anonymous'}
                  </h3>
                  
                  <div className="flex items-center gap-2">
                    <time className="text-xs text-slate-500">
                      {format(new Date(post.created_at), 'MMM d, yyyy')}
                    </time>
                    
                    {(user?.id === post.author_id || isGroupModerator) && (
                      <div className="relative">
                        <button
                          onClick={() => setActiveMenu(activeMenu === post.id ? null : post.id)}
                          className="p-1 rounded-full hover:bg-slate-100"
                        >
                          <MoreVertical size={16} className="text-slate-500" />
                        </button>
                        
                        {activeMenu === post.id && (
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 py-1">
                            <button
                              onClick={() => {
                                handleDeletePost(post.id);
                                setActiveMenu(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-slate-100 flex items-center gap-2"
                            >
                              <Trash2 size={16} />
                              <span>Delete Post</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <p className="mt-2 text-slate-700 whitespace-pre-line">{post.content}</p>
                
                {/* Display media if available */}
                {post.media && post.media.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {post.media.map((media: any, idx: number) => (
                      <div key={idx} className="aspect-square">
                        <img 
                          src={media.public_url} 
                          alt={`Post media ${idx + 1}`}
                          className="w-full h-full object-cover rounded-md"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="px-4 py-3 border-t border-slate-100">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-600 hover:text-indigo-600"
            >
              <MessageSquare size={18} className="mr-2" />
              Comment
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default GroupPostList;