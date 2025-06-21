import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';
import { Control, Controller, FieldError } from 'react-hook-form';
import Papa from 'papaparse';
import toast from 'react-hot-toast';

interface EventParticipantInviteFieldProps {
  control: Control<any>;
  name: string;
  error?: FieldError;
  label?: string;
  placeholder?: string;
}

const isValidEmail = (email: string): boolean => {
  // A simple regex for email validation
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const EventParticipantInviteField: React.FC<EventParticipantInviteFieldProps> = ({
  control,
  name,
  error,
  label = "Invite Participants",
  placeholder = "Add emails one by one..."
}) => {
  const [inputValue, setInputValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addEmails = (emailsToAdd: string[], currentEmails: string[], onChange: (emails: string[]) => void) => {
    const validNewEmails = emailsToAdd
      .map(email => email.trim().toLowerCase())
      .filter(email => email && isValidEmail(email) && !currentEmails.includes(email));

    if (validNewEmails.length > 0) {
      onChange([...currentEmails, ...validNewEmails]);
    }

    const skippedCount = emailsToAdd.length - validNewEmails.length;
    if (skippedCount > 0) {
        toast.error(`${skippedCount} emails were invalid or already in the list.`, { duration: 4000 });
    }

    if (validNewEmails.length > 0) {
        toast.success(`${validNewEmails.length} new emails were added from the file.`);
    }
  };

  const addSingleEmail = (onChange: (emails: string[]) => void, currentEmails: string[]) => {
    const emailsToAdd = inputValue.split(/[\s,]+/).filter(Boolean); // Split by space or comma
    if (emailsToAdd.length > 0) {
      addEmails(emailsToAdd, currentEmails, onChange);
      setInputValue('');
    }
  };

  const handleKeyDown = (onChange: (emails: string[]) => void, currentEmails: string[], event: React.KeyboardEvent<HTMLInputElement>) => {
    if ((event.key === 'Enter' || event.key === ',') && inputValue.trim()) {
      event.preventDefault();
      addSingleEmail(onChange, currentEmails);
    }
  };

  const handleBlur = (onChange: (emails: string[]) => void, currentEmails: string[]) => {
    if (inputValue.trim()) {
      addSingleEmail(onChange, currentEmails);
    }
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    currentEmails: string[],
    onChange: (emails: string[]) => void
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      bom: true,
      complete: (results) => {
        const data = results.data as string[][];
        const headerRowIndex = data.findIndex(row => row.some(cell => cell && cell.trim() !== ''));

        if (headerRowIndex === -1) {
          toast.error("Could not find any data in the CSV file.");
          return;
        }

        const headers = data[headerRowIndex].map(h => h ? h.trim().toLowerCase() : '');
        const emailColumnIndex = headers.findIndex(h => h.includes('email'));

        if (emailColumnIndex === -1) {
          toast.error("CSV file must contain a column with a header like 'email' or 'Email Address'.");
          return;
        }

        const dataRows = data.slice(headerRowIndex + 1);
        const emailsFromFile = dataRows.map(row => row[emailColumnIndex]).filter(Boolean);

        addEmails(emailsFromFile, currentEmails, onChange);
      },
      error: (err) => {
        console.error("PapaParse error:", err);
        toast.error('Failed to parse CSV file.');
      }
    });

    // Reliably reset the file input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeEmail = (onChange: (emails: string[]) => void, currentEmails: string[], emailToRemove: string) => {
    onChange(currentEmails.filter(email => email !== emailToRemove));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          title="Upload a CSV with an 'email' column"
        >
          Upload CSV
        </button>
      </div>

      <Controller
        name={name}
        control={control}
        defaultValue={[]}
        render={({ field: { onChange, value } }) => (
          <>
            <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(e, value || [], onChange)} accept=".csv, text/csv" className="hidden" />
            <div className="mt-1 flex flex-wrap gap-2 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700">
              {(value || []).map((email: string) => (
                <span key={email} className="flex items-center bg-indigo-100 text-indigo-700 text-sm font-medium pl-2.5 pr-1.5 py-0.5 rounded-full">
                  {email}
                  <button type="button" onClick={() => removeEmail(onChange, value, email)} className="ml-1.5 flex-shrink-0 text-indigo-500 hover:text-indigo-700 focus:outline-none" aria-label={`Remove ${email}`}>
                    <X size={16} />
                  </button>
                </span>
              ))}
              <input
                id={name}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => handleKeyDown(onChange, value || [], e)}
                onBlur={() => handleBlur(onChange, value || [])}
                placeholder={(!value || value.length === 0) ? placeholder : ""}
                className="flex-grow p-1 outline-none bg-transparent dark:text-white text-sm min-w-[150px]"
              />
            </div>
             {error && <p className="text-red-600 text-xs mt-1">{error.message}</p>}
          </>
        )}
      />
    </div>
  );
};

export default EventParticipantInviteField;