import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { User, Plus, Calendar, UserPlus, UsersRound, Heart, Baby, Pencil, Download, Search, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import FamilyMemberForm from './FamilyMemberForm';
import FamilyRelationshipForm from './FamilyRelationshipForm';
import FamilyTree from './FamilyTree';
import toast from 'react-hot-toast';

interface FamilyMember {
  id: string;
  first_name: string;
  last_name: string | null;
  birth_date: string | null;
  death_date: string | null;
  avatar_url: string | null;
  bio: string | null;
  profile_id: string | null;
}

interface FamilyRelationship {
  id: string;
  member1_id: string;
  member2_id: string;
  relationship_type: 'PARENT_CHILD' | 'SPOUSE' | 'SIBLING' | 'EX_SPOUSE' | 'EX_PARTNER' | 'PARTNER' | 'OTHER';
  start_date: string | null;
  end_date: string | null;
}

interface ProfileSearchResult {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface FamilyTreeSectionProps {
  memorialId: string;
  isOwner?: boolean;
  className?: string;
}

const FamilyTreeSection = ({ memorialId, isOwner = false, className = '' }: FamilyTreeSectionProps) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [relationships, setRelationships] = useState<FamilyRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [showRelationshipForm, setShowRelationshipForm] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProfileSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const fetchFamilyData = async () => {
    try {
      setLoading(true);
      
      // Fetch family members
      const { data: membersData, error: membersError } = await supabase
        .from('family_members')
        .select('*')
        .eq('memorial_id', memorialId)
        .order('birth_date', { ascending: true });
        
      if (membersError) throw membersError;

      // Fetch relationships
      const { data: relationshipsData, error: relationshipsError } = await supabase
        .from('family_relationships')
        .select('*')
        .eq('memorial_id', memorialId);
        
      if (relationshipsError) throw relationshipsError;
      
      setMembers(membersData || []);
      setRelationships(relationshipsData || []);
    } catch (err) {
      console.error('Error fetching family data:', err);
      setError('Failed to load family tree');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilyData();
    
    // Subscribe to changes
    const channel = supabase
      .channel(`memorial-${memorialId}-family`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'family_members',
          filter: `memorial_id=eq.${memorialId}`
        },
        () => {
          fetchFamilyData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'family_relationships',
          filter: `memorial_id=eq.${memorialId}`
        },
        () => {
          fetchFamilyData();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [memorialId]);

  const getRelationshipLabel = (type: string, isReversed: boolean = false) => {
    switch (type) {
      case 'PARENT_CHILD':
        return isReversed ? 'Child of' : 'Parent of';
      case 'SPOUSE':
        return 'Spouse of';
      case 'SIBLING':
        return 'Sibling of';
      case 'EX_SPOUSE':
        return 'Ex-spouse of';
      case 'EX_PARTNER':
        return 'Ex-partner of';
      case 'PARTNER':
        return 'Partner of';
      case 'OTHER':
        return 'Related to';
      default:
        return 'Related to';
    }
  };

  const getRelationshipIcon = (type: string) => {
    switch (type) {
      case 'PARENT_CHILD':
        return Baby;
      case 'SPOUSE':
      case 'PARTNER':
        return Heart;
      case 'EX_SPOUSE':
      case 'EX_PARTNER':
        return X;
      case 'SIBLING':
        return UsersRound;
      default:
        return User;
    }
  };

  const getMemberRelationships = (memberId: string) => {
    return relationships.filter(rel => 
      rel.member1_id === memberId || rel.member2_id === memberId
    ).map(rel => {
      const isReversed = rel.member2_id === memberId;
      const otherId = isReversed ? rel.member1_id : rel.member2_id;
      const otherMember = members.find(m => m.id === otherId);
      const RelIcon = getRelationshipIcon(rel.relationship_type);
      
      return {
        id: rel.id,
        type: rel.relationship_type,
        label: getRelationshipLabel(rel.relationship_type, isReversed),
        member: otherMember,
        startDate: rel.start_date,
        endDate: rel.end_date,
        icon: RelIcon
      };
    });
  };

  const handleEditMember = (memberId: string) => {
    setEditingMemberId(memberId);
    setShowMemberForm(true);
  };

  const handleSearchProfiles = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    
    try {
      setSearchLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
        .limit(5);
        
      if (error) throw error;
      
      setSearchResults(data || []);
    } catch (err) {
      console.error('Error searching profiles:', err);
      toast.error('Failed to search profiles');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleExportFamilyTree = async () => {
    if (!user) {
      toast.error('You must be logged in to export the family tree');
      return;
    }
    
    try {
      setExporting(true);
      
      const { data, error } = await supabase.functions.invoke('export_family_tree', {
        body: { 
          memorialId,
          format: 'svg' // Default format
        }
      });
      
      if (error) throw error;
      
      if (!data?.url) {
        throw new Error('No export URL received');
      }
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = data.url;
      link.download = `family-tree-${memorialId}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Family tree exported successfully');
    } catch (err) {
      console.error('Error exporting family tree:', err);
      toast.error('Failed to export family tree');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse space-y-4 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-lg">
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
    );
  }

  if (error) {
    return (
      <div className={`bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg ${className}`}>
        {error}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-serif text-slate-800">Family Tree</h2>
        
        <div className="flex gap-2">
          {members.length > 0 && (
            <div className="flex gap-2">
              <div className="flex border border-slate-200 rounded-md overflow-hidden">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 text-sm ${
                    viewMode === 'list' 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  List View
                </button>
                <button
                  onClick={() => setViewMode('tree')}
                  className={`px-3 py-1.5 text-sm ${
                    viewMode === 'tree' 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Tree View
                </button>
              </div>
              
              {isOwner && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportFamilyTree}
                  isLoading={exporting}
                  className="flex items-center gap-2"
                >
                  <Download size={16} />
                  <span>Export Tree</span>
                </Button>
              )}
            </div>
          )}
          
          {isOwner && (
            <div className="flex gap-2">
              {members.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowRelationshipForm(true)}
                  className="flex items-center gap-2"
                >
                  <UsersRound size={16} />
                  <span>Add Relationship</span>
                </Button>
              )}
              
              <Button
                size="sm"
                onClick={() => {
                  setEditingMemberId(null);
                  setSelectedProfileId(null);
                  setShowMemberForm(true);
                }}
                className="flex items-center gap-2"
              >
                <UserPlus size={16} />
                <span>Add Family Member</span>
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Profile Search */}
      {isOwner && !showMemberForm && !showRelationshipForm && (
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-md font-medium text-slate-800 mb-3">
              Search for Registered Users
            </h3>
            <div className="flex gap-2 mb-3">
              <div className="flex-grow">
                <Input
                  placeholder="Search by name or username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={<Search size={18} className="text-slate-400" />}
                />
              </div>
              <Button
                onClick={handleSearchProfiles}
                disabled={!searchQuery.trim() || searchQuery.length < 2 || searchLoading}
                isLoading={searchLoading}
              >
                Search
              </Button>
            </div>
            
            {searchResults.length > 0 && (
              <div className="border border-slate-200 rounded-md max-h-60 overflow-y-auto">
                {searchResults.map(profile => (
                  <div
                    key={profile.id}
                    className="p-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3 border-b border-slate-100 last:border-b-0"
                    onClick={() => {
                      setSelectedProfileId(profile.id);
                      setShowMemberForm(true);
                    }}
                  >
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.full_name || 'User'}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <User size={20} className="text-indigo-500" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-slate-800">
                        {profile.full_name || 'Anonymous'}
                      </div>
                      {profile.username && (
                        <div className="text-sm text-slate-500">
                          @{profile.username}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {searchQuery && searchResults.length === 0 && !searchLoading && (
              <div className="text-sm text-slate-500 p-2">
                No users found matching your search.
              </div>
            )}
          </div>
        </div>
      )}
      
      {showMemberForm && (
        <FamilyMemberForm
          memorialId={memorialId}
          memberId={editingMemberId || undefined}
          profileId={selectedProfileId || undefined}
          onMemberAdded={() => {
            setShowMemberForm(false);
            setEditingMemberId(null);
            setSelectedProfileId(null);
            fetchFamilyData();
          }}
          onCancel={() => {
            setShowMemberForm(false);
            setEditingMemberId(null);
            setSelectedProfileId(null);
          }}
          className="mb-6"
        />
      )}
      
      {showRelationshipForm && (
        <FamilyRelationshipForm
          memorialId={memorialId}
          onRelationshipAdded={() => {
            setShowRelationshipForm(false);
            fetchFamilyData();
          }}
          onCancel={() => setShowRelationshipForm(false)}
          className="mb-6"
        />
      )}
      
      {members.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg">
          <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-2" />
          <p className="text-slate-600">No family members added yet</p>
          {isOwner && !showMemberForm && (
            <button
              onClick={() => setShowMemberForm(true)}
              className="text-indigo-600 hover:text-indigo-800 mt-2"
            >
              Add the first family member
            </button>
          )}
        </div>
      ) : viewMode === 'tree' ? (
        <FamilyTree 
          memorialId={memorialId}
          isOwner={isOwner}
          className="mb-6"
        />
      ) : (
        <div className="space-y-4">
          {members.map(member => {
            const memberRelationships = getMemberRelationships(member.id);
            
            return (
              <div key={member.id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={`${member.first_name} ${member.last_name || ''}`}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
                        <User size={32} className="text-indigo-500" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-grow">
                    <div className="flex justify-between">
                      <h3 className="text-lg font-medium text-slate-800">
                        {member.first_name} {member.last_name}
                      </h3>
                      
                      {isOwner && (
                        <button
                          onClick={() => handleEditMember(member.id)}
                          className="text-slate-500 hover:text-indigo-600 p-1"
                          aria-label="Edit family member"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                    </div>
                    
                    <div className="text-sm text-slate-500 mt-1">
                      {member.birth_date && (
                        <span>
                          {format(new Date(member.birth_date), 'MMM d, yyyy')}
                        </span>
                      )}
                      {member.death_date && (
                        <>
                          {' - '}
                          <span>
                            {format(new Date(member.death_date), 'MMM d, yyyy')}
                          </span>
                        </>
                      )}
                    </div>
                    
                    {member.profile_id && (
                      <div className="mt-1 text-sm text-indigo-600">
                        <span className="inline-flex items-center gap-1">
                          <User size={14} />
                          <span>Linked to registered user</span>
                        </span>
                      </div>
                    )}
                    
                    {member.bio && (
                      <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                        {member.bio}
                      </p>
                    )}
                    
                    {/* Relationships */}
                    {memberRelationships.length > 0 && (
                      <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                        <h4 className="text-xs font-medium text-slate-500 uppercase mb-2">Relationships</h4>
                        {memberRelationships.map((rel, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm text-slate-600">
                            <rel.icon size={14} className="text-slate-400" />
                            <span className="font-medium">{rel.label}</span>
                            <span className="text-slate-700">
                              {rel.member?.first_name} {rel.member?.last_name}
                            </span>
                            {rel.startDate && (
                              <span className="text-xs text-slate-500">
                                (since {format(new Date(rel.startDate), 'yyyy')})
                              </span>
                            )}
                            {rel.endDate && (
                              <span className="text-xs text-slate-500">
                                (until {format(new Date(rel.endDate), 'yyyy')})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FamilyTreeSection;