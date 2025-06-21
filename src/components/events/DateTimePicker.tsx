import React, { forwardRef, useState, useEffect } from 'react';
import ReactDatePicker from 'react-datepicker';
import { Calendar, Clock } from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  minDate?: Date;
  showTimeSelect?: boolean;
  timeFormat?: string;
  dateFormat?: string;
  className?: string;
  disabled?: boolean;
}

const DateTimePicker = forwardRef<HTMLDivElement, DateTimePickerProps>(
  (
    {
      value,
      onChange,
      label,
      placeholder = 'Select date and time',
      required = false,
      error,
      minDate,
      showTimeSelect = true,
      timeFormat = 'h:mm aa',
      dateFormat = 'MMMM d, yyyy h:mm aa',
      className = '',
      disabled = false,
    },
    ref
  ) => {
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // Convert ISO string to Date object when value changes
    useEffect(() => {
      if (value) {
        try {
          setSelectedDate(new Date(value));
        } catch (e) {
          console.error('Invalid date format:', value);
          setSelectedDate(null);
        }
      } else {
        setSelectedDate(null);
      }
    }, [value]);

    // Handle date change
    const handleChange = (date: Date | null) => {
      setSelectedDate(date);
      if (date) {
        // Convert to ISO string format
        onChange(date.toISOString());
      } else {
        onChange('');
      }
    };

    // Custom input component to style the input field
    const CustomInput = forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(
      ({ value, onClick }, ref) => (
        <div
          ref={ref}
          className={`
            flex items-center px-3 py-2 bg-white border shadow-sm border-slate-300 
            placeholder-slate-400 focus-within:outline-none focus-within:border-indigo-500 
            focus-within:ring-1 focus-within:ring-indigo-500 rounded-md
            ${disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'cursor-pointer'}
            ${error ? 'border-rose-500 focus-within:border-rose-500 focus-within:ring-rose-500' : ''}
          `}
          onClick={disabled ? undefined : onClick}
        >
          <div className="flex-grow">
            {value || <span className="text-slate-400">{placeholder}</span>}
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <Calendar size={16} className="mr-1" />
            {showTimeSelect && <Clock size={16} />}
          </div>
        </div>
      )
    );

    CustomInput.displayName = 'CustomDateTimeInput';

    return (
      <div ref={ref} className={className}>
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {label}
            {required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}
        
        <ReactDatePicker
          selected={selectedDate}
          onChange={handleChange}
          showTimeSelect={showTimeSelect}
          timeFormat={timeFormat}
          dateFormat={dateFormat}
          timeIntervals={15}
          minDate={minDate}
          customInput={<CustomInput />}
          disabled={disabled}
          popperClassName="z-50" // Ensure the dropdown appears above other elements
          calendarClassName="bg-white shadow-lg border border-slate-200 rounded-md"
          wrapperClassName="w-full"
        />
        
        {error && (
          <p className="mt-1 text-sm text-rose-600">{error}</p>
        )}
      </div>
    );
  }
);

DateTimePicker.displayName = 'DateTimePicker';

export default DateTimePicker;