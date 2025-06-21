import { useState } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import UserProfileCard from '../components/users/UserProfileCard';

interface SearchResult {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
}

const UserSearch = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      setError('Please enter a search term');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: searchError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, bio')
        .ilike('full_name', `%${query}%`)
        .neq('id', user?.id) // Exclude current user
        .order('full_name');
        
      if (searchError) throw searchError;
      
      setResults(data || []);
      setSearched(true);
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-serif text-slate-800 mb-2">
          Find Friends
        </h1>
        <p className="text-slate-600 mb-8">
          Search for people by name and connect with them.
        </p>
        
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-4">
            <div className="flex-grow">
              <Input
                placeholder="Search by name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                error={error || undefined}
                className="pl-10"
                icon={<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />}
              />
            </div>
            
            <Button
              type="submit"
              disabled={!query.trim() || loading}
              isLoading={loading}
            >
              Search
            </Button>
          </div>
        </form>
        
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white p-4 rounded-lg animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-200 rounded-full" />
                  <div className="flex-grow">
                    <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-slate-200 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : searched ? (
          results.length > 0 ? (
            <div className="space-y-4">
              {results.map(user => (
                <UserProfileCard
                  key={user.id}
                  id={user.id}
                  full_name={user.full_name}
                  username={user.username}
                  avatar_url={user.avatar_url}
                  bio={user.bio}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg">
              <p className="text-slate-600 mb-2">No users found matching "{query}"</p>
              <p className="text-sm text-slate-500">
                Try searching with a different name
              </p>
            </div>
          )
        ) : (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-slate-600">
              Enter a name above to search for users
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSearch;