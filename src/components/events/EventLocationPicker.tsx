import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader2, Video } from 'lucide-react';
import { Control, Controller, FieldError, UseFormSetValue } from 'react-hook-form';
import Input from '../ui/Input';
import { EventBasicInfoFormData } from './EventBasicInfoFormSection';

interface EventLocationPickerProps {
  control: Control<any>;
  setValue: UseFormSetValue<EventBasicInfoFormData>; // ADDED: setValue as a prop
  name: string;
  error?: FieldError;
  required?: boolean;
  locationType: 'physical' | 'online';
}

const EventLocationPicker: React.FC<EventLocationPickerProps> = ({
  control,
  setValue, // ADDED: destructure setValue from props
  name,
  error,
  required = true,
  locationType
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  if (locationType === 'online') {
    return (
      <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1">
          Online Meeting Link/Details{required && '*'}
        </label>
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <Input
              id={name}
              {...field}
              value={field.value || ''}
              placeholder="Enter meeting link or details (e.g., Zoom, Google Meet)"
              error={error?.message}
              required={required}
              icon={<Video size={18} className="text-slate-400" />}
            />
          )}
        />
      </div>
    );
  }

  // Functions for handling search and selection would go here
  // For brevity, they are omitted, but they would use the `setValue` prop.

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1">
        Location{required && '*'}
      </label>
      <Controller
        name={name}
        control={control}
        render={({ field: { onChange, value, ...fieldProps } }) => (
          <div className="relative">
            <Input
              id={name}
              type="text"
              value={value || ''} // Ensure value is not null
              onChange={onChange}
              placeholder="Search for a location or enter address"
              error={error?.message}
              required={required}
              icon={<MapPin size={18} className="text-slate-400" />}
              {...fieldProps}
            />
            {/* Suggestions rendering logic would be here */}
          </div>
        )}
      />
    </div>
  );
};

export default EventLocationPicker;