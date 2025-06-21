import { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Input from '../ui/Input';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface FamilyRelationshipFormProps {
  memorialId: string;
  onRelationshipAdded: () => void;
  onCancel?: () => void;
  className?: string;
}

interface FamilyMember {
  id: string;
  first_name: string;
  last_name: string | null;
}

const relationshipTypes = [
  { value: 'PARENT_CHILD', label: 'Parent/Child' },
  { value: 'SPOUSE', label: 'Spouse' },
  { value: 'PARTNER', label: 'Partner' },
  { value: 'SIBLING', label: 'Sibling' },
  { value: 'EX_SPOUSE', label: 'Ex-Spouse' },
  { value: 'EX_PARTNER', label: 'Ex-Partner' },
  { value: 'OTHER', label: 'Other Relationship' }
] as const;

// Validation schema
const relationshipSchema = z.object({
  member1_id: z.string().min(1, 'First member is required'),
  member2_id: z.string().min(1, 'Second member is required'),
  relationship_type: z.enum(['PARENT_CHILD', 'SPOUSE', 'SIBLING', 'EX_SPOUSE', 'EX_PARTNER', 'PARTNER', 'OTHER'], {
    errorMap: () => ({ message: 'Please select a relationship type' })
  }),
  start_date: z.string().optional(),
  end_date: z.string().optional()
}).refine(data => data.member1_id !== data.member2_id, {
  message: 'Cannot create a relationship between the same person',
  path: ['member2_id']
}).refine(data => {
  // If both dates are provided, ensure start_date is before end_date
  if (data.start_date && data.end_date) {
    return new Date(data.start_date) < new Date(data.end_date);
  }
  return true;
}, {
  message: "Start date must be before end date",
  path: ["end_date"]
});

type RelationshipFormData = z.infer<typeof relationshipSchema>;

const FamilyRelationshipForm = ({
  memorialId,
  onRelationshipAdded,
  onCancel,
  className = ''
}: FamilyRelationshipFormProps) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingMembers, setFetchingMembers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    register, 
    handleSubmit, 
    watch,
    reset,
    formState: { errors } 
  } = useForm<RelationshipFormData>({
    resolver: zodResolver(relationshipSchema),
    defaultValues: {
      member1_id: '',
      member2_id: '',
      relationship_type: undefined,
      start_date: '',
      end_date: ''
    }
  });

  // Watch member1_id to disable it in member2 selection
  const member1Id = watch('member1_id');
  const relationshipType = watch('relationship_type');

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setFetchingMembers(true);
        
        const { data, error: fetchError } = await supabase
          .from('family_members')
          .select('id, first_name, last_name')
          .eq('memorial_id', memorialId)
          .order('first_name');
          
        if (fetchError) throw fetchError;
        setMembers(data || []);
      } catch (err) {
        console.error('Error fetching family members:', err);
        setError('Failed to load family members');
        toast.error('Failed to load family members');
      } finally {
        setFetchingMembers(false);
      }
    };

    fetchMembers();
  }, [memorialId]);

  const onSubmit: SubmitHandler<RelationshipFormData> = async (data) => {
    if (!user) {
      setError('You must be logged in to add relationships');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);

      // For PARENT_CHILD relationships, ensure member1 is parent
      let member1Id = data.member1_id;
      let member2Id = data.member2_id;
      
      if (data.relationship_type === 'PARENT_CHILD') {
        // member1 should be parent, member2 should be child
        const member1 = members.find(m => m.id === member1Id);
        const member2 = members.find(m => m.id === member2Id);
        
        if (member1 && member2) {
          // If member1's birth date is after member2's, swap them
          const { data: dates } = await supabase
            .from('family_members')
            .select('id, birth_date')
            .in('id', [member1Id, member2Id]);
            
          if (dates && dates.length === 2) {
            const date1 = dates.find(d => d.id === member1Id)?.birth_date;
            const date2 = dates.find(d => d.id === member2Id)?.birth_date;
            
            if (date1 && date2 && new Date(date1) > new Date(date2)) {
              [member1Id, member2Id] = [member2Id, member1Id];
            }
          }
        }
      }

      const { error: insertError } = await supabase
        .from('family_relationships')
        .insert({
          memorial_id: memorialId,
          member1_id: member1Id,
          member2_id: member2Id,
          relationship_type: data.relationship_type,
          start_date: data.start_date || null,
          end_date: data.end_date || null
        });
        
      if (insertError) {
        if (insertError.code === '23505') { // Unique constraint violation
          throw new Error('This relationship already exists');
        }
        throw insertError;
      }
      
      toast.success('Relationship added successfully');
      
      // Reset form
      reset();
      
      onRelationshipAdded();
      
    } catch (err) {
      console.error('Error adding relationship:', err);
      setError(err instanceof Error ? err.message : 'Failed to add relationship');
      toast.error('Failed to add relationship');
    } finally {
      setLoading(false);
    }
  };

  // Show end date field for relationship types that can end
  const showEndDate = ['EX_SPOUSE', 'EX_PARTNER', 'SPOUSE', 'PARTNER'].includes(relationshipType || '');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            First Member
          </label>
          <select
            {...register('member1_id')}
            className={`w-full px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md ${errors.member1_id ? 'border-rose-500' : ''}`}
            disabled={fetchingMembers}
          >
            <option value="">Select member</option>
            {members.map(member => (
              <option key={member.id} value={member.id}>
                {member.first_name} {member.last_name}
              </option>
            ))}
          </select>
          {errors.member1_id && (
            <p className="mt-1 text-sm text-rose-600">{errors.member1_id.message}</p>
          )}
          {fetchingMembers && (
            <p className="mt-1 text-sm text-slate-500">Loading members...</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Second Member
          </label>
          <select
            {...register('member2_id')}
            className={`w-full px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md ${errors.member2_id ? 'border-rose-500' : ''}`}
            disabled={fetchingMembers}
          >
            <option value="">Select member</option>
            {members.map(member => (
              <option 
                key={member.id} 
                value={member.id}
                disabled={member.id === member1Id}
              >
                {member.first_name} {member.last_name}
              </option>
            ))}
          </select>
          {errors.member2_id && (
            <p className="mt-1 text-sm text-rose-600">{errors.member2_id.message}</p>
          )}
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Relationship Type
        </label>
        <select
          {...register('relationship_type')}
          className={`w-full px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md ${errors.relationship_type ? 'border-rose-500' : ''}`}
        >
          <option value="">Select type</option>
          {relationshipTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        {errors.relationship_type && (
          <p className="mt-1 text-sm text-rose-600">{errors.relationship_type.message}</p>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Input
          type="date"
          label="Start Date"
          {...register('start_date')}
          error={errors.start_date?.message}
        />
        
        {showEndDate && (
          <Input
            type="date"
            label="End Date"
            {...register('end_date')}
            error={errors.end_date?.message}
          />
        )}
      </div>
      
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
        
        <Button
          type="submit"
          isLoading={loading}
          disabled={!watch('member1_id') || !watch('member2_id') || !watch('relationship_type') || loading}
        >
          Add Relationship
        </Button>
      </div>
    </form>
  );
};

export default FamilyRelationshipForm;