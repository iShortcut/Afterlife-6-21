import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';

const CalendarCallback = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing your calendar connection...');

  useEffect(() => {
    const completeOAuth = async () => {
      if (!user) {
        setStatus('error');
        setMessage('You must be logged in to connect your calendar');
        return;
      }

      try {
        // Get code and state from URL
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code || !state) {
          throw new Error('Missing required OAuth parameters');
        }

        // Call backend function to complete OAuth flow
        const { data, error: completeError } = await supabase.functions.invoke('complete_calendar_oauth', {
          body: { 
            code,
            state,
            userId: user.id
          }
        });

        if (completeError) throw completeError;
        
        setStatus('success');
        setMessage(data?.message || 'Calendar connected successfully!');
      } catch (err) {
        console.error('Error completing calendar OAuth:', err);
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Failed to connect calendar');
      }
    };

    completeOAuth();
  }, [user, location.search, navigate]);

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="mx-auto h-12 w-12 text-indigo-600 animate-spin mb-4" />
            <h2 className="text-xl font-medium text-slate-800 mb-2">Connecting Your Calendar</h2>
            <p className="text-slate-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="mx-auto h-12 w-12 text-emerald-600 mb-4" />
            <h2 className="text-xl font-medium text-slate-800 mb-2">Calendar Connected!</h2>
            <p className="text-slate-600 mb-6">{message}</p>
            <Button onClick={() => navigate('/profile')}>
              Return to Profile
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-rose-600 mb-4" />
            <h2 className="text-xl font-medium text-slate-800 mb-2">Connection Failed</h2>
            <p className="text-slate-600 mb-6">{message}</p>
            <Button onClick={() => navigate('/profile')}>
              Return to Profile
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default CalendarCallback;