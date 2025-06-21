import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, X, Check, Calendar, BookHeart, MessageSquare, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface ContentSuggestion {
  id: string;
  user_id: string;
  content_type: 'MEMORIAL_UPDATE' | 'TIMELINE_EVENT' | 'TRIBUTE' | 'POST';
  content_preview: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'IMPLEMENTED';
  created_at: string;
  target_id?: string;
  metadata: {
    title?: string;
    description?: string;
    memorial_id?: string;
    memorial_title?: string;
    event_date?: string;
    category_id?: string;
  };
}

interface ContentSuggestionWidgetProps {
  limit?: number;
  className?: string;
}

const ContentSuggestionWidget = ({ limit = 3, className = '' }: ContentSuggestionWidgetProps) => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<ContentSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('ai_content_suggestions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;
      setSuggestions(data || []);
    } catch (err) {
      console.error('Error fetching content suggestions:', err);
      setError('Failed to load content suggestions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();

    // Subscribe to changes in the ai_content_suggestions table
    const channel = supabase
      .channel('ai_content_suggestions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_content_suggestions',
          filter: `user_id=eq.${user?.id}`
        },
        () => {
          fetchSuggestions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleDismiss = async (suggestionId: string) => {
    try {
      const { error } = await supabase
        .from('ai_content_suggestions')
        .update({ status: 'REJECTED' })
        .eq('id', suggestionId);

      if (error) throw error;

      // Update local state
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
      toast.success('Suggestion dismissed');
    } catch (err) {
      console.error('Error dismissing suggestion:', err);
      toast.error('Failed to dismiss suggestion');
    }
  };

  const handleAccept = async (suggestionId: string) => {
    try {
      const { error } = await supabase
        .from('ai_content_suggestions')
        .update({ status: 'ACCEPTED' })
        .eq('id', suggestionId);

      if (error) throw error;

      // Update local state
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
      toast.success('Suggestion accepted');
    } catch (err) {
      console.error('Error accepting suggestion:', err);
      toast.error('Failed to accept suggestion');
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'MEMORIAL_UPDATE':
        return <BookHeart className="text-indigo-500" size={20} />;
      case 'TIMELINE_EVENT':
        return <Calendar className="text-emerald-500" size={20} />;
      case 'TRIBUTE':
        return <MessageSquare className="text-amber-500" size={20} />;
      case 'POST':
        return <User className="text-blue-500" size={20} />;
      default:
        return <Lightbulb className="text-indigo-500" size={20} />;
    }
  };

  const getSuggestionLink = (suggestion: ContentSuggestion) => {
    switch (suggestion.content_type) {
      case 'MEMORIAL_UPDATE':
        return `/edit-memorial/${suggestion.metadata.memorial_id}`;
      case 'TIMELINE_EVENT':
        return `/memorials/${suggestion.metadata.memorial_id}`;
      case 'TRIBUTE':
        return `/memorials/${suggestion.metadata.memorial_id}`;
      case 'POST':
        return `/dashboard`;
      default:
        return '#';
    }
  };

  const getSuggestionTitle = (suggestion: ContentSuggestion) => {
    switch (suggestion.content_type) {
      case 'MEMORIAL_UPDATE':
        return `Update for ${suggestion.metadata.memorial_title || 'Memorial'}`;
      case 'TIMELINE_EVENT':
        return suggestion.metadata.title || 'New Timeline Event';
      case 'TRIBUTE':
        return `Tribute for ${suggestion.metadata.memorial_title || 'Memorial'}`;
      case 'POST':
        return 'New Post Suggestion';
      default:
        return 'Content Suggestion';
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-4 animate-pulse ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-slate-200 rounded-full" />
          <div className="h-4 bg-slate-200 rounded w-1/3" />
        </div>
        {[...Array(2)].map((_, i) => (
          <div key={i} className="mb-3 h-24 bg-slate-200 rounded" />
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

  if (suggestions.length === 0) {
    return null; // Don't show the widget if there are no suggestions
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="text-amber-500" size={20} />
        <h3 className="font-medium text-slate-800">Content Suggestions</h3>
      </div>

      <AnimatePresence>
        {suggestions.map(suggestion => (
          <motion.div
            key={suggestion.id}
            initial={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-3 bg-indigo-50 rounded-lg p-4 relative"
          >
            <div className="absolute top-2 right-2 flex gap-1">
              <button
                onClick={() => handleAccept(suggestion.id)}
                className="p-1 bg-white rounded-full text-emerald-600 hover:bg-emerald-100 transition-colors"
                aria-label="Accept suggestion"
              >
                <Check size={16} />
              </button>
              <button
                onClick={() => handleDismiss(suggestion.id)}
                className="p-1 bg-white rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                aria-label="Dismiss suggestion"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-start gap-3 mb-2">
              {getSuggestionIcon(suggestion.content_type)}
              <div>
                <h4 className="font-medium text-slate-800">
                  {getSuggestionTitle(suggestion)}
                </h4>
                <p className="text-xs text-slate-500">
                  {new Date(suggestion.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-700 mb-3 line-clamp-2">
              {suggestion.content_preview}
            </p>

            <Link
              to={getSuggestionLink(suggestion)}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              View Details
            </Link>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ContentSuggestionWidget;