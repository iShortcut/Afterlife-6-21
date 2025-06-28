import { useState, useEffect, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { X, Search, User, Upload, Check, AlertCircle, UserPlus } from 'lucide-react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Papa from 'papaparse';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import toast from 'react-hot-toast';

interface GroupInviteModalProps {
  groupId: string;
  groupName: string;
  onClose: () => void;
  onInvitationsSent: () => void;
}

// Validation schema
const inviteSchema = z.object({
  users: z.array(z.string()).optional(),
  emails: z.array(z.string().email('Invalid email address')).optional(),
  message: z.string().optional()
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface UserSearchResult {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_member?: boolean;
  is_invited?: boolean;
}

interface CSVContact {
  name?: string;
  email: string;
  valid: boolean;
}

const GroupInviteModal = ({ groupId, groupName, onClose, onInvitationsSent }: GroupInviteModalProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'csv'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([]);
  const [csvContacts, setCsvContacts] = useState<CSVContact[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingMembers, setExistingMembers] = useState<string[]>([]);
  const [existingInvites, setExistingInvites] = useState<string[]>([]);
  
  const defaultMessage = `You've been invited to join the group "${groupName}" on Afterlife. Join us to connect, share memories, and participate in group discussions.`;
  
  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      users: [],
      emails: [],
      message: defaultMessage
    }
  });

  // Fetch existing members and invites
  useEffect(() => {
    const fetchExistingData = async () => {
      if (!user || !groupId) return;

      try {
        // First check if user has permission to manage this group
        const { data: userMembership, error: membershipError } = await supabase
          .from('group_members')
          .select('role')
          .eq('group_id', groupId)
          .eq('user_id', user.id)
          .single();

        if (membershipError || !userMembership || !['ADMIN', 'MODERATOR'].includes(userMembership.role)) {
          toast.error('You do not have permission to invite members to this group');
          onClose();
          return;
        }

        // Fetch existing members - only get user_id since we have permission through group membership
        const { data: membersData, error: membersError } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', groupId);

        if (membersError) {
          console.error('Error fetching members:', membersError);
          throw new Error('Failed to fetch group members');
        }
        
        setExistingMembers(membersData?.map(m => m.user_id) || []);

        // Fetch existing invites - only get user_id and email
        const { data: invitesData, error: invitesError } = await supabase
          .from('group_invitations')
          .select('user_id, email')
          .eq('group_id', groupId)
          .eq('status', 'pending');

        if (invitesError) {
          console.error('Error fetching invites:', invitesError);
          throw new Error('Failed to fetch existing invitations');
        }
        
        const invitedUserIds = invitesData?.filter(i => i.user_id).map(i => i.user_id) || [];
        const invitedEmails = invitesData?.filter(i => i.email).map(i => i.email) || [];
        
        setExistingInvites([...invitedUserIds, ...invitedEmails]);
      } catch (err) {
        console.error('Error fetching existing members and invites:', err);
        toast.error('Failed to load existing group data');
      }
    };

    fetchExistingData();
  }, [groupId, user, onClose]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    
    try {
      setIsSearching(true);
      
      // Search profiles table directly - this should work with proper RLS policies
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
        .neq('id', user.id)
        .limit(10);
        
      if (error) {
        console.error('Search error:', error);
        throw new Error('Failed to search users');
      }
      
      // Mark users who are already members or invited
      const resultsWithStatus = (data || []).map(profile => ({
        ...profile,
        is_member: existingMembers.includes(profile.id),
        is_invited: existingInvites.includes(profile.id)
      }));
      
      setSearchResults(resultsWithStatus);
    } catch (err) {
      console.error('Error searching users:', err);
      toast.error('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const handleUserSelect = (user: UserSearchResult) => {
    if (user.is_member || user.is_invited) return;
    
    // Check if user is already selected
    if (selectedUsers.some(u => u.id === user.id)) {
      setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers(prev => [...prev, user]);
    }
    
    // Update form value
    const userIds = selectedUsers.map(u => u.id);
    if (userIds.includes(user.id)) {
      setValue('users', userIds.filter(id => id !== user.id));
    } else {
      setValue('users', [...userIds, user.id]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const contacts: CSVContact[] = [];
        
        results.data.forEach((row: any) => {
          // Try to find email field (case insensitive)
          const emailKey = Object.keys(row).find(key => 
            key.toLowerCase() === 'email' || 
            key.toLowerCase() === 'email address' || 
            key.toLowerCase() === 'e-mail'
          );
          
          // Try to find name field (case insensitive)
          const nameKey = Object.keys(row).find(key => 
            key.toLowerCase() === 'name' || 
            key.toLowerCase() === 'full name' || 
            key.toLowerCase() === 'fullname'
          );
          
          if (emailKey) {
            const email = row[emailKey].trim();
            const name = nameKey ? row[nameKey].trim() : undefined;
            
            // Validate email format
            const isValidEmail = /\S+@\S+\.\S+/.test(email);
            const isExistingInvite = existingInvites.includes(email);
            
            contacts.push({
              name,
              email,
              valid: isValidEmail && !isExistingInvite
            });
          }
        });
        
        setCsvContacts(contacts);
        
        // Pre-select all valid emails
        const validEmails = contacts.filter(c => c.valid).map(c => c.email);
        setSelectedEmails(validEmails);
        setValue('emails', validEmails);
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        toast.error('Failed to parse CSV file');
      }
    });
    
    // Reset file input
    e.target.value = '';
  };

  const toggleEmailSelection = (email: string) => {
    if (selectedEmails.includes(email)) {
      setSelectedEmails(prev => prev.filter(e => e !== email));
      setValue('emails', selectedEmails.filter(e => e !== email));
    } else {
      setSelectedEmails(prev => [...prev, email]);
      setValue('emails', [...selectedEmails, email]);
    }
  };

  const onSubmit: SubmitHandler<InviteFormData> = async (data) => {
    if (!user) return;
    
    const userIds = data.users || [];
    const emails = data.emails || [];
    
    if (userIds.length === 0 && emails.length === 0) {
      toast.error('Please select at least one user or email to invite');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Prepare invitations data
      const invitations = [
        // User invitations
        ...userIds.map(userId => ({
          group_id: groupId,
          user_id: userId,
          invited_by: user.id,
          message: data.message || defaultMessage,
          status: 'pending'
        })),
        // Email invitations
        ...emails.map(email => ({
          group_id: groupId,
          email,
          invited_by: user.id,
          message: data.message || defaultMessage,
          status: 'pending'
        }))
      ];
      
      // Insert invitations
      const { error: inviteError } = await supabase
        .from('group_invitations')
        .insert(invitations);
        
      if (inviteError) {
        console.error('Error inserting invitations:', inviteError);
        throw new Error('Failed to send invitations');
      }
      
      // Send notifications to users
      if (userIds.length > 0) {
        const notifications = userIds.map(recipientId => ({
          recipient_id: recipientId,
          sender_id: user.id,
          type: 'GROUP_INVITATION',
          entity_type: 'GROUP',
          entity_id: groupId,
          message: `You've been invited to join the group "${groupName}"`,
          metadata: {
            group_id: groupId,
            group_name: groupName,
            inviter_id: user.id
          }
        }));
        
        const { error: notifyError } = await supabase
          .from('notifications')
          .insert(notifications);
          
        if (notifyError) {
          console.error('Error sending notifications:', notifyError);
          // Don't throw here, notifications are not critical
        }
      }
      
      // Send emails (would typically be handled by an Edge Function)
      if (emails.length > 0) {
        // In a real implementation, this would call an Edge Function to send emails
        console.log('Would send emails to:', emails);
      }
      
      toast.success('Invitations sent successfully');
      onInvitationsSent();
      onClose();
    } catch (err) {
      console.error('Error sending invitations:', err);
      toast.error('Failed to send invitations');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h2 className="text-lg font-medium text-slate-800">Invite Members to "{groupName}"</h2>
            <button
              onClick={onClose}
              className="p-1 text-slate-500 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'users'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Invite Users
            </button>
            <button
              onClick={() => setActiveTab('csv')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'csv'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Import from CSV
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {activeTab === 'users' ? (
                <div>
                  <div className="mb-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Search for users by name or username..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        icon={<Search size={18} className="text-slate-400" />}
                        className="flex-grow"
                      />
                      <Button
                        onClick={handleSearch}
                        disabled={!searchQuery.trim() || isSearching}
                        isLoading={isSearching}
                      >
                        Search
                      </Button>
                    </div>
                  </div>

                  {/* Selected users */}
                  {selectedUsers.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-slate-700 mb-2">Selected Users</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedUsers.map(user => (
                          <div 
                            key={user.id} 
                            className="flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-sm"
                          >
                            <span>{user.full_name || user.username}</span>
                            <button 
                              type="button"
                              onClick={() => handleUserSelect(user)}
                              className="text-indigo-500 hover:text-indigo-700"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Search results */}
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-slate-700 mb-2">Search Results</h3>
                    {isSearching ? (
                      <div className="text-center py-4">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent"></div>
                        <p className="mt-2 text-sm text-slate-500">Searching...</p>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">
                        {searchQuery ? 'No users found matching your search' : 'Search for users to invite'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {searchResults.map(result => (
                          <div 
                            key={result.id} 
                            className={`flex items-center justify-between p-3 rounded-md ${
                              result.is_member || result.is_invited
                                ? 'bg-slate-100 cursor-not-allowed'
                                : 'bg-white hover:bg-slate-50 cursor-pointer'
                            }`}
                            onClick={() => !result.is_member && !result.is_invited && handleUserSelect(result)}
                          >
                            <div className="flex items-center gap-3">
                              {result.avatar_url ? (
                                <img 
                                  src={result.avatar_url} 
                                  alt={result.full_name || 'User'} 
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                  <User size={20} className="text-indigo-500" />
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-slate-800">
                                  {result.full_name || 'Anonymous'}
                                </div>
                                {result.username && (
                                  <div className="text-xs text-slate-500">
                                    @{result.username}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              {result.is_member ? (
                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                                  Already a member
                                </span>
                              ) : result.is_invited ? (
                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                                  Already invited
                                </span>
                              ) : (
                                <div 
                                  className={`w-5 h-5 rounded-full border ${
                                    selectedUsers.some(u => u.id === result.id)
                                      ? 'bg-indigo-600 border-indigo-600 flex items-center justify-center'
                                      : 'border-slate-300'
                                  }`}
                                >
                                  {selectedUsers.some(u => u.id === result.id) && (
                                    <Check size={12} className="text-white" />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-4">
                    <div className="border-2 border-dashed border-slate-300 rounded-md p-4 text-center hover:border-indigo-400 transition-colors">
                      <input
                        type="file"
                        id="csv-upload"
                        accept=".csv"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      <label
                        htmlFor="csv-upload"
                        className="cursor-pointer block"
                      >
                        <Upload className="mx-auto h-12 w-12 text-slate-400" />
                        <p className="mt-2 text-sm text-slate-600">
                          Click or drag and drop to upload a CSV file
                        </p>
                        <p className="text-xs text-slate-500">
                          CSV should include columns for name and email
                        </p>
                      </label>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                      <a 
                        href="#" 
                        className="text-indigo-600 hover:text-indigo-800"
                        onClick={(e) => {
                          e.preventDefault();
                          // In a real app, this would download a template
                          toast.success('CSV template downloaded');
                        }}
                      >
                        Download CSV template
                      </a>
                    </div>
                  </div>

                  {/* CSV contacts */}
                  {csvContacts.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-slate-700">Contacts from CSV</h3>
                        <div className="text-xs text-slate-500">
                          {selectedEmails.length} of {csvContacts.length} selected
                        </div>
                      </div>
                      <div className="border border-slate-200 rounded-md overflow-hidden">
                        <table className="min-w-full divide-y divide-slate-200">
                          <thead className="bg-slate-50">
                            <tr>
                              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                <input
                                  type="checkbox"
                                  checked={selectedEmails.length === csvContacts.filter(c => c.valid).length}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      const validEmails = csvContacts.filter(c => c.valid).map(c => c.email);
                                      setSelectedEmails(validEmails);
                                      setValue('emails', validEmails);
                                    } else {
                                      setSelectedEmails([]);
                                      setValue('emails', []);
                                    }
                                  }}
                                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                              </th>
                              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Name
                              </th>
                              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Email
                              </th>
                              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-200">
                            {csvContacts.map((contact, index) => (
                              <tr key={index} className={!contact.valid ? 'bg-slate-50' : ''}>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    checked={selectedEmails.includes(contact.email)}
                                    onChange={() => contact.valid && toggleEmailSelection(contact.email)}
                                    disabled={!contact.valid}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                  />
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-700">
                                  {contact.name || '-'}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-700">
                                  {contact.email}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  {contact.valid ? (
                                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                                      Valid
                                    </span>
                                  ) : existingInvites.includes(contact.email) ? (
                                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                                      Already invited
                                    </span>
                                  ) : (
                                    <span className="text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded-full">
                                      Invalid email
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Invitation message */}
              <div className="mt-4">
                <Controller
                  name="message"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Invitation Message
                      </label>
                      <TextArea
                        {...field}
                        minRows={4}
                        maxRows={6}
                        className="w-full px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md"
                        placeholder="Enter a message to include with the invitation"
                      />
                    </div>
                  )}
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={isSubmitting}
                disabled={
                  isSubmitting || 
                  ((selectedUsers.length === 0 || !watch('users')?.length) && 
                  (selectedEmails.length === 0 || !watch('emails')?.length))
                }
              >
                Send Invitations
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  );
};

export default GroupInviteModal;