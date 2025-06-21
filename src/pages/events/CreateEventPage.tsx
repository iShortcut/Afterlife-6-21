import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { EventCreateForm } from '../../components/events/EventCreateForm';
import Button from '../../components/ui/Button';
import { ArrowLeft } from 'lucide-react';

const CreateEventPage = () => {
  const { memorialId } = useParams<{ memorialId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [memorialName, setMemorialName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If memorialId is provided via URL params, fetch its details
    if (memorialId) {
      fetchMemorialDetails(memorialId);
    } else {
      setLoading(false);
    }
  }, [memorialId, user]);

  const fetchMemorialDetails = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      // Check if user has permission to create events for this memorial
      const { data: canEdit } = await supabase.rpc('can_edit_memorial', {
        memorial_id: id,
        user_id: user?.id
      });

      if (!canEdit) {
        setError('You do not have permission to create events for this memorial');
        return;
      }

      // Fetch memorial details
      const { data: memorial, error: memorialError } = await supabase
        .from('memorials')
        .select('title')
        .eq('id', id)
        .single();

      if (memorialError) throw memorialError;
      setMemorialName(memorial.title);
    } catch (err) {
      console.error('Error fetching memorial details:', err);
      setError('Failed to load memorial details');
    } finally {
      setLoading(false);
    }
  };

  const handleEventCreated = () => {
    if (memorialId) {
      navigate(`/memorials/${memorialId}`);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto"
      >
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(memorialId ? `/memorials/${memorialId}` : '/dashboard')}
              className="flex items-center gap-1"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </Button>
          </div>
          
          <h1 className="text-3xl font-serif text-slate-800 mb-2">Create Event</h1>
          
          {memorialName && (
            <p className="text-slate-600">
              Creating an event for <span className="font-medium">{memorialName}</span>
            </p>
          )}
          
          {!memorialName && !loading && !error && (
            <p className="text-slate-600">
              Create an event to bring people together and honor your loved one's memory.
            </p>
          )}
          
          {error && (
            <p className="text-rose-600 mt-2">
              {error}
            </p>
          )}
        </div>
        
        {!loading && !error && (
          <EventCreateForm 
            memorialId={memorialId} 
            onEventCreated={handleEventCreated} 
          />
        )}
      </motion.div>
    </div>
  );
};

export default CreateEventPage;