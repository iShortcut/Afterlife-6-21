import React from 'react';
import { Control, Controller, FieldError } from 'react-hook-form';

interface EventLocationTypeSelectorProps {
  control: Control<any>;
  name: string;
  error?: FieldError;
  defaultValue?: string;
}

const locationTypeOptions = [
  { value: 'physical', label: 'Physical Location' },
  { value: 'online', label: 'Online Meeting' },
];

const EventLocationTypeSelector: React.FC<EventLocationTypeSelectorProps> = ({ 
  control, 
  name, 
  error, 
  defaultValue = 'physical' 
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Location Type
      </label>
      <Controller
        name={name}
        control={control}
        defaultValue={defaultValue}
        rules={{ required: 'Please select a location type' }}
        render={({ field }) => (
          <div className="mt-2 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:space-x-4 rtl:sm:space-x-reverse">
            {locationTypeOptions.map((option) => (
              <div key={option.value} className="flex items-center">
                <input
                  id={`${name}-${option.value}`}
                  type="radio"
                  {...field}
                  value={option.value}
                  checked={field.value === option.value}
                  className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-500 dark:bg-gray-700 focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800"
                />
                <label htmlFor={`${name}-${option.value}`} className="ml-2 rtl:mr-2 block text-sm text-gray-900 dark:text-gray-300">
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        )}
      />
      {error && <p className="text-red-600 text-xs mt-1">{error.message}</p>}
    </div>
  );
};

export default EventLocationTypeSelector;