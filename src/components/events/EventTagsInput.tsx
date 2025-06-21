import { useState, useEffect, KeyboardEvent } from 'react';
import { Tag, X, Plus } from 'lucide-react';
import { Control, Controller, FieldError } from 'react-hook-form';

interface EventTagsInputProps {
  control: Control<any>;
  name: string;
  error?: FieldError;
  label?: string;
  placeholder?: string;
  className?: string;
}

const EventTagsInput = ({
  control,
  name,
  error,
  label = "Tags",
  placeholder = "Add tags...",
  className = ''
}: EventTagsInputProps) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (
    onChange: (tags: string[]) => void,
    currentTags: string[],
    e: KeyboardEvent<HTMLInputElement>
  ) => {
    // Add tag on Enter, comma, or space
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      addTag(onChange, currentTags);
    }
  };

  const addTag = (
    onChange: (tags: string[]) => void,
    currentTags: string[]
  ) => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue) return;

    // Remove any trailing commas
    const tagValue = trimmedValue.endsWith(',') 
      ? trimmedValue.slice(0, -1).trim() 
      : trimmedValue;

    // Don't add if empty or already exists
    if (tagValue && !currentTags.includes(tagValue)) {
      onChange([...currentTags, tagValue]);
    }
    
    setInputValue('');
  };

  const removeTag = (
    onChange: (tags: string[]) => void,
    currentTags: string[],
    tagToRemove: string
  ) => {
    onChange(currentTags.filter(tag => tag !== tagToRemove));
  };

  const handlePaste = (
    onChange: (tags: string[]) => void,
    currentTags: string[],
    e: React.ClipboardEvent<HTMLInputElement>
  ) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    // Split by commas, spaces, or newlines
    const newTags = pastedText
      .split(/[,\s\n]+/)
      .map(tag => tag.trim())
      .filter(tag => tag && !currentTags.includes(tag));
    
    if (newTags.length > 0) {
      onChange([...currentTags, ...newTags]);
    }
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      
      <Controller
        name={name}
        control={control}
        defaultValue={[]}
        render={({ field: { onChange, value } }) => (
          <div className="border border-slate-300 rounded-md p-2 bg-white focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
            <div className="flex flex-wrap gap-2 mb-2">
              {value.map((tag: string, index: number) => (
                <div 
                  key={index} 
                  className="flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-sm"
                >
                  <Tag size={14} />
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(onChange, value, tag)}
                    className="text-indigo-500 hover:text-indigo-700 focus:outline-none"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="flex items-center">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => handleKeyDown(onChange, value, e)}
                onPaste={(e) => handlePaste(onChange, value, e)}
                onBlur={() => addTag(onChange, value)}
                placeholder={value.length === 0 ? placeholder : ""}
                className="flex-grow border-0 p-1 focus:outline-none focus:ring-0 text-sm"
              />
              
              <button
                type="button"
                onClick={() => addTag(onChange, value)}
                disabled={!inputValue.trim()}
                className="text-indigo-600 hover:text-indigo-800 disabled:text-slate-400 p-1 focus:outline-none"
                aria-label="Add tag"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        )}
      />
      
      {error && (
        <p className="mt-1 text-sm text-rose-600">{error.message}</p>
      )}
      
      <p className="mt-1 text-xs text-slate-500">
        Press Enter, comma, or space to add tags. Tags help categorize your event.
      </p>
    </div>
  );
};

export default EventTagsInput;