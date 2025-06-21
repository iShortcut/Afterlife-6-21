import { useState, useEffect } from 'react';
import { Key, Plus, Loader2, Copy, Check, X, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import toast from 'react-hot-toast';

interface APIKey {
  id: string;
  key_prefix: string;
  label: string | null;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
}

const DeveloperAPISettings = () => {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAPIKeys();
  }, [user]);

  const fetchAPIKeys = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setApiKeys(data || []);
    } catch (err) {
      console.error('Error fetching API keys:', err);
      setError('Failed to load API keys');
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = async () => {
    if (!user) return;
    if (!newKeyLabel.trim()) {
      toast.error('Please enter a label for your API key');
      return;
    }

    try {
      setGenerating(true);
      setError(null);

      const { data, error: generateError } = await supabase.functions.invoke('create_api_key', {
        body: { label: newKeyLabel.trim() }
      });

      if (generateError) throw generateError;
      if (!data?.key) throw new Error('No API key returned');

      setNewKey(data.key);
      setNewKeyLabel('');
      fetchAPIKeys(); // Refresh the list
      toast.success('API key generated successfully');
    } catch (err) {
      console.error('Error generating API key:', err);
      setError('Failed to generate API key');
      toast.error('Failed to generate API key');
    } finally {
      setGenerating(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!user) return;
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      setRevoking(keyId);
      setError(null);

      const { error: revokeError } = await supabase.functions.invoke('revoke_api_key', {
        body: { keyId }
      });

      if (revokeError) throw revokeError;

      setApiKeys(prev => prev.filter(key => key.id !== keyId));
      toast.success('API key revoked successfully');
    } catch (err) {
      console.error('Error revoking API key:', err);
      setError('Failed to revoke API key');
      toast.error('Failed to revoke API key');
    } finally {
      setRevoking(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopied(true);
        toast.success('API key copied to clipboard');
        setTimeout(() => setCopied(false), 3000);
      })
      .catch(() => {
        toast.error('Failed to copy API key');
      });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium text-slate-800">API Keys</h2>
          <p className="text-slate-600">Manage your API keys for third-party integrations</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Key label (e.g., 'Development', 'Production')"
            value={newKeyLabel}
            onChange={(e) => setNewKeyLabel(e.target.value)}
            className="w-64"
          />
          <Button
            onClick={handleGenerateKey}
            disabled={generating || !newKeyLabel.trim()}
            isLoading={generating}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            <span>Generate Key</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {newKey && (
        <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-indigo-800">Your New API Key</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(newKey)}
              className="flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <Check size={14} />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy</span>
                </>
              )}
            </Button>
          </div>
          <div className="bg-white p-3 rounded border border-indigo-200 font-mono text-sm break-all">
            {newKey}
          </div>
          <div className="mt-2 flex items-center gap-2 text-indigo-700">
            <AlertTriangle size={16} />
            <p className="text-sm font-medium">
              This key will only be shown once. Store it securely.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : apiKeys.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <Key className="mx-auto h-12 w-12 text-slate-300 mb-2" />
          <p className="text-slate-600 mb-2">No API keys found</p>
          <p className="text-sm text-slate-500">
            Generate an API key to integrate with third-party services
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Label
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Key Prefix
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Created
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Last Used
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {apiKeys.map((key) => (
                <tr key={key.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                    {key.label || 'Unnamed Key'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono">
                    {key.key_prefix}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {formatDate(key.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {formatDate(key.last_used_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {key.is_active ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-800">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevokeKey(key.id)}
                      isLoading={revoking === key.id}
                      className="text-rose-600 hover:text-rose-800"
                    >
                      <X size={14} className="mr-1" />
                      Revoke
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-slate-50 p-4 rounded-lg">
        <h3 className="text-md font-medium text-slate-800 mb-2">API Key Security</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600">
          <li>API keys grant access to your account's data. Keep them secure.</li>
          <li>Do not share your API keys in publicly accessible areas.</li>
          <li>Revoke keys immediately if they are compromised.</li>
          <li>Each integration should use a separate API key.</li>
        </ul>
      </div>
    </div>
  );
};

export default DeveloperAPISettings;