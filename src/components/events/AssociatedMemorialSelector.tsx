import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { BookHeart, Search, Loader2, X } from 'lucide-react';
import Input from '../ui/Input';

interface Memorial {
  id: string;
  title: string;
  visibility: string;
  profile_image_url: string | null;
}

interface AssociatedMemorialSelectorProps {
  value: string | null;
  onChange: (memorialId: string | null) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

const AssociatedMemorialSelector = ({
  value,
  onChange,
  required = false,
  disabled = false,
  className = ''
}: AssociatedMemorialSelectorProps) => {
  const { user } = useAuth();
  const [memorials, setMemorials] = useState<Memorial[]>([]);
  const [filteredMemorials, setFilteredMemorials] = useState<Memorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchMemorials = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch memorials where user is owner or has edit permissions
        const { data, error: fetchError } = await supabase
          .from('memorials')
          .select('id, title, visibility, profile_image_url')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        // Also fetch memorials shared with the user with edit permissions
        const { data: sharedData, error: sharedError } = await supabase
          .from('memorial_shares')
          .select(`
            memorial_id,
            memorials:memorial_id (
              id, title, visibility, profile_image_url
            )
          `)
          .eq('shared_with_user_id', user.id)
          .eq('permission_level', 'edit');

        if (sharedError) throw sharedError;

        // Combine owned and shared memorials
        const ownedMemorials = data || [];
        const sharedMemorials = sharedData
          ? sharedData
              .filter(item => item.memorials) // Filter out any null memorials
              .map(item => item.memorials as Memorial)
          : [];

        // Remove duplicates (in case a memorial is both owned and shared)
        const allMemorials = [...ownedMemorials];
        sharedMemorials.forEach(memorial => {
          if (!allMemorials.some(m => m.id === memorial.id)) {
            allMemorials.push(memorial);
          }
        });

        setMemorials(allMemorials);
        setFilteredMemorials(allMemorials);
      } catch (err) {
        console.error('Error fetching memorials:', err);
        setError('Failed to load memorials');
      } finally {
        setLoading(false);
      }
    };

    fetchMemorials();
  }, [user]);

  // Filter memorials based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMemorials(memorials);
      return;
    }

    const filtered = memorials.filter(memorial =>
      memorial.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredMemorials(filtered);
  }, [searchQuery, memorials]);

  const handleSelectMemorial = (memorialId: string | null) => {
    onChange(memorialId);
    setIsDropdownOpen(false);
    setSearchQuery('');
  };

  const selectedMemorial = memorials.find(m => m.id === value);

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        Associated Memorial {required && <span className="text-rose-500">*</span>}
      </label>
      
      {loading ? (
        <div className="flex items-center gap-2 p-2 border border-slate-300 rounded-md bg-slate-50">
          <Loader2 size={18} className="text-indigo-500 animate-spin" />
          <span className="text-slate-500">Loading memorials...</span>
        </div>
      ) : (
        <>
          <div 
            className={`relative border border-slate-300 rounded-md ${disabled ? 'bg-slate-100' : 'bg-white'}`}
          >
            {/* Selected memorial display or placeholder */}
            <div
              className="flex items-center p-2 cursor-pointer"
              onClick={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}
            >
              {selectedMemorial ? (
                <div className="flex items-center gap-2 flex-grow">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden">
                    {selectedMemorial.profile_image_url ? (
                      <img 
                        src={selectedMemorial.profile_image_url} 
                        alt={selectedMemorial.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookHeart size={16} className="text-indigo-500" />
                    )}
                  </div>
                  <div className="flex-grow">
                    <div className="text-sm font-medium text-slate-800">{selectedMemorial.title}</div>
                    <div className="text-xs text-slate-500 capitalize">{selectedMemorial.visibility} memorial</div>
                  </div>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectMemorial(null);
                      }}
                      className="text-slate-400 hover:text-slate-600 p-1"
                      aria-label="Clear selection"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-grow text-slate-500">
                  <BookHeart size={18} className="text-slate-400" />
                  <span>{disabled ? 'No memorial selected' : 'Select a memorial (optional)'}</span>
                </div>
              )}
            </div>

            {/* Dropdown for memorial selection */}
            {isDropdownOpen && !disabled && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                <div className="p-2 border-b border-slate-200">
                  <Input
                    placeholder="Search memorials..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    icon={<Search size={16} className="text-slate-400" />}
                    className="mb-0"
                  />
                </div>
                
                {filteredMemorials.length === 0 ? (
                  <div className="p-3 text-center text-slate-500 text-sm">
                    {searchQuery ? 'No memorials match your search' : 'No memorials available'}
                  </div>
                ) : (
                  <div>
                    {/* Option to clear selection */}
                    {value && (
                      <div
                        className="p-2 hover:bg-slate-100 cursor-pointer text-slate-600 flex items-center gap-2"
                        onClick={() => handleSelectMemorial(null)}
                      >
                        <X size={16} />
                        <span>Clear selection</span>
                      </div>
                    )}
                    
                    {filteredMemorials.map(memorial => (
                      <div
                        key={memorial.id}
                        className={`p-2 hover:bg-slate-100 cursor-pointer ${
                          memorial.id === value ? 'bg-indigo-50' : ''
                        }`}
                        onClick={() => handleSelectMemorial(memorial.id)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden">
                            {memorial.profile_image_url ? (
                              <img 
                                src={memorial.profile_image_url} 
                                alt={memorial.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <BookHeart size={16} className="text-indigo-500" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-800">{memorial.title}</div>
                            <div className="text-xs text-slate-500 capitalize">{memorial.visibility} memorial</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {error && (
            <p className="mt-1 text-sm text-rose-600">{error}</p>
          )}
        </>
      )}
    </div>
  );
};

export default AssociatedMemorialSelector;