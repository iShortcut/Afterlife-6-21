import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Control, Controller, FieldError } from 'react-hook-form';
import { Loader2 } from 'lucide-react';

interface EventType {
  id: string;
  name_en: string;
  religion: string;
  sort_order?: number;
  icon?: string | null;
}

interface EventTypeSelectProps {
  control: Control<any>;
  name: string;
  error?: FieldError;
  required?: boolean;
}

const EventTypeSelect: React.FC<EventTypeSelectProps> = ({ 
  control, 
  name, 
  error,
  required = true
}) => {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchEventTypes = async () => {
      try {
        setIsLoading(true);
        setIsError(false);
        setErrorMessage(null);

        const { data, error } = await supabase
          .from('event_types')
          .select('id, name_en, icon, religion, sort_order')
          .order('religion', { ascending: true })
          .order('sort_order', { ascending: true })
          .order('name_en', { ascending: true });

        if (error) throw error;
        setEventTypes(data || []);
      } catch (err) {
        console.error('Error fetching event types:', err);
        setIsError(true);
        setErrorMessage(err instanceof Error ? err.message : 'Failed to load event types');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventTypes();
  }, []);

  // Group event types by religion
  const groupedEventTypes = eventTypes.reduce((acc, eventType) => {
    const religion = eventType.religion || 'Other';
    if (!acc[religion]) {
      acc[religion] = [];
    }
    acc[religion].push(eventType);
    return acc;
  }, {} as Record<string, EventType[]>);

  // Sort religions in a specific order
  const religionOrder = ['Judaism', 'Christianity', 'Islam', 'Interfaith', 'General', 'National', 'Other'];
  const sortedReligions = Object.keys(groupedEventTypes).sort(
    (a, b) => religionOrder.indexOf(a) - religionOrder.indexOf(b)
  );

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1">
        Event Type{required && '*'}
      </label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <div className="relative">
            <select
              id={name}
              {...field}
              disabled={isLoading || isError}
              className={`
                w-full px-3 py-2 bg-white border shadow-sm border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                ${error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : ''}
              `}
            >
              <option value="">
                {isLoading ? "Loading event types..." : isError ? "Error loading types" : "Select event type..."}
              </option>
              
              {!isLoading && !isError && sortedReligions.map(religion => (
                <optgroup key={religion} label={religion}>
                  {groupedEventTypes[religion].map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name_en}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {isLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 size={16} className="animate-spin text-slate-400" />
              </div>
            )}
          </div>
        )}
      />
      {error && <p className="mt-1 text-sm text-rose-600">{error.message}</p>}
      {isError && !error && <p className="mt-1 text-sm text-rose-600">Error loading event types: {errorMessage}</p>}
    </div>
  );
};

export default EventTypeSelect;