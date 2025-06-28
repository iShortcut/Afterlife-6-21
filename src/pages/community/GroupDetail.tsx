import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { CommunityGroup } from '../../types';
import Button from '../../components/ui/Button';
import TextArea from '../../components/ui/TextArea';
import GroupHeader from '../../components/community/GroupHeader';
import GroupPostForm from '../../components/community/GroupPostForm';
import GroupPostList from '../../components/community/GroupPostList';
import GroupAdminPanel from '../../components/community/GroupAdminPanel';
import GroupMembersList from '../../components/community/GroupMembersList';
import JoinRequestsManager from '../../components/community/JoinRequestsManager';
import toast from 'react-hot-toast';

const GroupDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [group, setGroup] = useState<CommunityGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'members' | 'requests'>('posts');
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [groupRules, setGroupRules] = useState<string | null>(null);
  const [isEditingRules, setIsEditingRules] = useState(false);
  const [rulesText, setRulesText] = useState('');

  const fetchGroupDetails = async () => {
    if (!user || !id) return;

    try {
      setLoading(true);
      setError(null);

      // Check if user is a member of the group
      const { data: membership, error: membershipError } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      // Fetch group details
      const { data: groupData, error: groupError } = await supabase
        .from('community_groups')
        .select('*, group_rules(rules_text)')
        .eq('id', id)
        .single();

      if (groupError) {
        // If the group doesn't exist or is secret and user is not a member
        if (groupError.code === 'PGRST116') {
          navigate('/groups');
          return;
        }
        throw groupError;
      }

      // Get member count
      const { count: memberCount, error: countError } = await supabase
        .from('group_members')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', id);

      if (countError) throw countError;

      // Get pending join requests count (for admins only)
      let pendingRequests = 0;
      if (membership?.role === 'ADMIN') {
        const { count: requestCount, error: requestError } = await supabase
          .from('group_join_requests')
          .select('id', { count: 'exact', head: true })
          .eq('group_id', id)
          .eq('status', 'pending');
          
        if (!requestError) {
          pendingRequests = requestCount || 0;
          setPendingRequestsCount(pendingRequests);
        }
      }

      // Check if user can access this group
      const isMember = !!membership;
      const isAdmin = membership?.role === 'ADMIN';
      const isPublic = groupData.privacy === 'public';

      if (!isPublic && !isMember) {
        setError('This group is private. You need to be a member to view it.');
        setLoading(false);
        return;
      }

      // Set group rules if available
      if (groupData.group_rules && groupData.group_rules.length > 0) {
        setGroupRules(groupData.group_rules[0].rules_text);
        setRulesText(groupData.group_rules[0].rules_text || '');
      }

      setGroup({
        ...groupData,
        member_count: memberCount || 0,
        is_member: isMember,
        is_admin: isAdmin
      });
    } catch (err) {
      console.error('Error fetching group details:', err);
      setError('Failed to load group details');
      toast.error('Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupDetails();
  }, [id, user]);

  const handleSaveRules = async () => {
    if (!user || !group || !group.is_admin) return;

    try {
      // Check if rules already exist
      const { data: existingRules, error: checkError } = await supabase
        .from('group_rules')
        .select('id')
        .eq('group_id', id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;

      if (existingRules) {
        // Update existing rules
        const { error: updateError } = await supabase
          .from('group_rules')
          .update({ rules_text: rulesText })
          .eq('id', existingRules.id);

        if (updateError) throw updateError;
      } else {
        // Insert new rules
        const { error: insertError } = await supabase
          .from('group_rules')
          .insert({
            group_id: id,
            rules_text: rulesText,
            created_by: user.id
          });

        if (insertError) throw insertError;
      }

      setGroupRules(rulesText);
      setIsEditingRules(false);
      toast.success('Group rules updated');
    } catch (err) {
      console.error('Error saving group rules:', err);
      toast.error('Failed to save group rules');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-lg text-center">
          <h2 className="text-xl font-medium mb-2">Group Not Found</h2>
          <p className="mb-4">{error || "This group doesn't exist or you don't have permission to view it."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <GroupHeader 
          group={group} 
          onGroupUpdated={fetchGroupDetails} 
          className="mb-6"
        />
        
        {showAdminPanel && group.is_admin ? (
          <GroupAdminPanel 
            group={group} 
            onGroupUpdated={() => {
              fetchGroupDetails();
              setShowAdminPanel(false);
            }}
            className="mb-6"
          />
        ) : (
          <>
            {/* Group Rules Section */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium text-slate-800">Group Rules</h3>
                {group.is_admin && !isEditingRules && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsEditingRules(true)}
                  >
                    Edit Rules
                  </Button>
                )}
              </div>
              
              {isEditingRules ? (
                <div>
                  <TextArea
                    value={rulesText}
                    onChange={(e) => setRulesText(e.target.value)}
                    placeholder="Enter group rules and guidelines..."
                    minRows={4}
                    className="mb-2"
                  />
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setIsEditingRules(false);
                        setRulesText(groupRules || '');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleSaveRules}
                    >
                      Save Rules
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  {groupRules ? (
                    <p className="text-slate-600 whitespace-pre-line">{groupRules}</p>
                  ) : (
                    <p className="text-slate-400 italic">No rules have been set for this group yet.</p>
                  )}
                </div>
              )}
            </div>

            <div className="mb-6">
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setActiveTab('posts')}
                  className={`px-4 py-2 text-sm font-medium ${
                    activeTab === 'posts'
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Posts
                </button>
                
                <button
                  onClick={() => setActiveTab('members')}
                  className={`px-4 py-2 text-sm font-medium ${
                    activeTab === 'members'
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Members
                </button>
                
                {group.is_admin && (
                  <button
                    onClick={() => setActiveTab('requests')}
                    className={`px-4 py-2 text-sm font-medium flex items-center ${
                      activeTab === 'requests'
                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Join Requests</span>
                    {pendingRequestsCount > 0 && (
                      <span className="ml-2 bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {pendingRequestsCount}
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>
            
            {activeTab === 'posts' ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  {group.is_member && (
                    <GroupPostForm 
                      groupId={group.id} 
                      onPostCreated={fetchGroupDetails}
                      className="mb-6"
                    />
                  )}
                  
                  <GroupPostList groupId={group.id} />
                </div>
                
                <div>
                  <div className="bg-white rounded-lg shadow-sm p-4 sticky top-24">
                    <h3 className="text-lg font-medium text-slate-800 mb-4">About this Group</h3>
                    
                    {group.description && (
                      <p className="text-slate-600 mb-4">{group.description}</p>
                    )}
                    
                    <div className="text-sm text-slate-500">
                      <p>Created {new Date(group.created_at).toLocaleDateString()}</p>
                      <p>{group.member_count} members</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'members' ? (
              <GroupMembersList 
                groupId={group.id} 
                isAdmin={group.is_admin}
              />
            ) : (
              <JoinRequestsManager 
                groupId={group.id}
                groupName={group.name}
              />
            )}
          </>
        )}
      </motion.div>
    </div>
  );
};

export default GroupDetail;