import React, { useState, useCallback } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import { Control, Controller } from 'react-hook-form';

interface EventCoverImageUploadProps {
  control: Control<any>;
  name: string;
  initialPreviewUrl?: string | null;
  label?: string;
  error?: string;
}

const EventCoverImageUpload: React.FC<EventCoverImageUploadProps> = ({
  control,
  name,
  initialPreviewUrl = null,
  label = "Cover Image (optional)",
  error
}) => {
  const handleFileChange = (
    onChange: (file: File | null) => void,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0] || null;
    onChange(file);
    
    // Create preview URL if file exists
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const [preview, setPreview] = useState<string | null>(initialPreviewUrl);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (
    onChange: (file: File | null) => void,
    e: React.DragEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      onChange(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (onChange: (file: File | null) => void) => {
    setPreview(null);
    onChange(null);
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      
      <Controller
        name={name}
        control={control}
        render={({ field: { onChange, value, ...field } }) => (
          <>
            {preview ? (
              <div className="mt-1 relative">
                <img 
                  src={preview} 
                  alt="Cover preview" 
                  className="max-h-48 w-full object-cover rounded-md"
                />
                <button
                  type="button"
                  onClick={() => removeImage(onChange)}
                  className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-rose-100"
                >
                  <X size={16} className="text-rose-600" />
                </button>
              </div>
            ) : (
              <div
                className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-gray-600 border-dashed rounded-md hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors cursor-pointer"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(onChange, e)}
                onClick={() => document.getElementById(`${name}-upload`)?.click()}
              >
                <div className="space-y-1 text-center">
                  <ImageIcon className="mx-auto h-12 w-12 text-slate-400" />
                  <div className="flex text-sm text-slate-600 dark:text-gray-400">
                    <p className="pl-1">
                      Drag and drop or click to select a cover image
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-gray-500">
                    PNG, JPG, WEBP up to 2MB
                  </p>
                </div>
              </div>
            )}
            
            <input
              id={`${name}-upload`}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => handleFileChange(onChange, e)}
              {...field}
            />
          </>
        )}
      />
      
      {error && (
        <p className="mt-1 text-sm text-rose-600">{error}</p>
      )}
    </div>
  );
};

export default EventCoverImageUpload;