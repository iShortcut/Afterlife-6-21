import { useState, useEffect } from 'react';
import { Calendar, RefreshCw, Trash2, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface CalendarIntegration {
  id: string;
  provider: 'GOOGLE' | 'OUTLOOK';
  account_email: string | null;
  sync_enabled: boolean;
  last_sync: string | null;
  last_sync_status: string | null;
}

const CalendarSyncSettings = () => {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  useEffect(() => {
    const fetchIntegrations = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('user_calendar_integrations')
          .select('*')
          .eq('user_id', user.id);

        if (fetchError) throw fetchError;
        setIntegrations(data || []);
      } catch (err) {
        console.error('Error fetching calendar integrations:', err);
        setError('Failed to load calendar integrations');
        toast.error('Failed to load calendar integrations');
      } finally {
        setLoading(false);
      }
    };

    fetchIntegrations();
  }, [user]);

  const handleConnect = async (provider: 'GOOGLE' | 'OUTLOOK') => {
    if (!user) {
      toast.error('You must be logged in to connect calendars');
      return;
    }

    try {
      setConnecting(provider);

      // Call backend function to start OAuth flow
      const { data, error } = await supabase.functions.invoke('start_calendar_oauth', {
        body: { 
          provider,
          userId: user.id,
          redirectUrl: `${window.location.origin}/calendar/callback`
        }
      });

      if (error) throw error;
      
      if (!data?.authUrl) {
        throw new Error('No authorization URL received');
      }

      // Redirect to OAuth provider
      window.location.href = data.authUrl;
    } catch (err) {
      console.error(`Error connecting to ${provider} calendar:`, err);
      toast.error(`Failed to connect to ${provider} calendar`);
      setConnecting(null);
    }
  };

  const handleDisconnect = async (integrationId: string, provider: string) => {
    if (!user) return;

    if (!confirm(`Are you sure you want to disconnect your ${provider} calendar?`)) {
      return;
    }

    try {
      setDisconnecting(integrationId);

      // Call backend function to disconnect calendar
      const { error } = await supabase.functions.invoke('disconnect_calendar', {
        body: { 
          integrationId,
          userId: user.id
        }
      });

      if (error) throw error;
      
      // Update local state
      setIntegrations(prev => prev.filter(i => i.id !== integrationId));
      toast.success(`${provider} calendar disconnected`);
    } catch (err) {
      console.error(`Error disconnecting ${provider} calendar:`, err);
      toast.error(`Failed to disconnect ${provider} calendar`);
    } finally {
      setDisconnecting(null);
    }
  };

  const toggleSync = async (integrationId: string, currentStatus: boolean) => {
    if (!user) return;

    try {
      // Update the integration
      const { error } = await supabase
        .from('user_calendar_integrations')
        .update({ sync_enabled: !currentStatus })
        .eq('id', integrationId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Update local state
      setIntegrations(prev => 
        prev.map(i => 
          i.id === integrationId ? { ...i, sync_enabled: !currentStatus } : i
        )
      );
      
      toast.success(`Calendar sync ${!currentStatus ? 'enabled' : 'disabled'}`);
    } catch (err) {
      console.error('Error toggling calendar sync:', err);
      toast.error('Failed to update calendar sync settings');
    }
  };

  const formatLastSync = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium text-slate-800">Calendar Integrations</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => handleConnect('GOOGLE')}
            variant="outline"
            disabled={!!connecting || integrations.some(i => i.provider === 'GOOGLE')}
            isLoading={connecting === 'GOOGLE'}
            className="flex items-center gap-2"
          >
            <Calendar size={18} />
            <span>Connect Google Calendar</span>
          </Button>
          
          <Button
            onClick={() => handleConnect('OUTLOOK')}
            variant="outline"
            disabled={!!connecting || integrations.some(i => i.provider === 'OUTLOOK')}
            isLoading={connecting === 'OUTLOOK'}
            className="flex items-center gap-2"
          >
            <Calendar size={18} />
            <span>Connect Outlook Calendar</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {integrations.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-2" />
          <p className="text-slate-600 mb-2">No calendar integrations found</p>
          <p className="text-sm text-slate-500">
            Connect your calendar to sync memorial events
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {integrations.map(integration => (
            <div key={integration.id} className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Calendar size={20} className="text-indigo-600" />
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-slate-800">
                      {integration.provider} Calendar
                    </h3>
                    {integration.account_email && (
                      <p className="text-sm text-slate-500">
                        {integration.account_email}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleSync(integration.id, integration.sync_enabled)}
                    className={`flex items-center gap-1.5 ${
                      integration.sync_enabled 
                        ? 'text-emerald-600 hover:bg-emerald-50' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {integration.sync_enabled ? (
                      <>
                        <CheckCircle size={16} />
                        <span>Sync On</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={16} />
                        <span>Sync Off</span>
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisconnect(integration.id, integration.provider)}
                    isLoading={disconnecting === integration.id}
                    className="flex items-center gap-1.5 text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 size={16} />
                    <span>Disconnect</span>
                  </Button>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                <div className="text-slate-500">
                  Last synced: {formatLastSync(integration.last_sync)}
                </div>
                
                <div className="flex items-center gap-1.5">
                  {integration.last_sync_status === 'SUCCESS' ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle size={14} />
                      <span>Sync successful</span>
                    </span>
                  ) : integration.last_sync_status === 'FAILED' ? (
                    <span className="text-rose-600 flex items-center gap-1">
                      <XCircle size={14} />
                      <span>Sync failed</span>
                    </span>
                  ) : (
                    <span className="text-slate-500">No sync status</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-slate-50 p-4 rounded-lg">
        <h3 className="text-md font-medium text-slate-800 mb-2">About Calendar Integration</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600">
          <li>Connect your calendar to automatically sync memorial events</li>
          <li>Events will be added to your calendar when you RSVP</li>
          <li>You can disable sync at any time</li>
          <li>We only access your calendar to add memorial events</li>
        </ul>
      </div>
    </div>
  );
};

export default CalendarSyncSettings;