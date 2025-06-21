import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import TextArea from '../ui/TextArea';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface TributeInputFormProps {
  memorialId: string;
  parentId?: string | null;
  onSuccess: () => void;
  onCancel?: () => void;
  placeholder?: string;
  className?: string;
}

// Validation schema
const tributeSchema = z.object({
  content: z.string().min(1, 'Please enter a message')
});

type TributeFormData = z.infer<typeof tributeSchema>;

const TributeInputForm = ({
  memorialId,
  parentId = null,
  onSuccess,
  onCancel,
  placeholder = "Share your memories, thoughts, or condolences...",
  className = ''
}: TributeInputFormProps) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { 
    register, 
    handleSubmit, 
    reset,
    formState: { errors } 
  } = useForm<TributeFormData>({
    resolver: zodResolver(tributeSchema),
    defaultValues: {
      content: ''
    }
  });

  const onSubmit: SubmitHandler<TributeFormData> = async (data) => {
    if (!user) {
      toast.error('You must be logged in to leave a tribute');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const { error: submitError } = await supabase
        .from('tributes')
        .insert({
          content: data.content.trim(),
          memorial_id: memorialId,
          author_id: user.id,
          parent_tribute_id: parentId,
          type: parentId ? 'comment' : 'tribute'
        });
        
      if (submitError) throw submitError;
      
      reset();
      toast.success(parentId ? 'Reply posted' : 'Tribute posted');
      onSuccess();
    } catch (err) {
      console.error('Error submitting tribute:', err);
      toast.error('Failed to submit tribute');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
      <TextArea
        placeholder={placeholder}
        {...register('content')}
        error={errors.content?.message}
        minRows={3}
        maxRows={8}
      />
      
      <div className="flex justify-end gap-2 mt-4">
        {onCancel && (
          <Button 
            type="button" 
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        
        <Button 
          type="submit" 
          disabled={isSubmitting}
          isLoading={isSubmitting}
        >
          {parentId ? 'Reply' : 'Post Tribute'}
        </Button>
      </div>
    </form>
  );
};

export default TributeInputForm;