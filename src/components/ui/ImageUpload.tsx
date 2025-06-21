import { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import Button from './Button';

interface ImageUploadProps {
  label: string;
  initialImage?: string | null;
  onImageChange: (file: File | null) => void;
  aspectRatio?: 'square' | 'cover' | 'profile';
  error?: string;
  className?: string;
  maxFiles?: number;
  accept?: string;
}

const aspectRatioClasses = {
  square: 'aspect-square',
  cover: 'aspect-[3/1]',
  profile: 'aspect-[4/5]',
};

const ImageUpload = ({
  label,
  initialImage,
  onImageChange,
  aspectRatio = 'square',
  error,
  className = '',
  maxFiles = 1,
  accept = 'image/*'
}: ImageUploadProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImage || null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleFile(file);
  };

  const handleFile = (file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      onImageChange(file);
    } else {
      setPreviewUrl(null);
      onImageChange(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeImage = () => {
    setPreviewUrl(null);
    onImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`mb-4 ${className}`}>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      
      <div
        className={`
          border-2 border-dashed rounded-md p-4 text-center cursor-pointer
          transition-colors duration-200
          ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400'}
          ${error ? 'border-rose-500' : ''}
        `}
        onClick={triggerFileInput}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={0}
        aria-label={`Upload ${label}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            triggerFileInput();
          }
        }}
      >
        <input
          type="file"
          className="hidden"
          accept={accept}
          onChange={handleFileChange}
          ref={fileInputRef}
          aria-hidden="true"
        />
        
        {previewUrl ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Preview"
              className={`mx-auto object-cover ${aspectRatioClasses[aspectRatio]} rounded-md`}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeImage();
              }}
              className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-rose-100"
              aria-label="Remove image"
            >
              <X size={16} className="text-rose-600" />
            </button>
          </div>
        ) : (
          <div className="py-4">
            <Upload className="mx-auto h-12 w-12 text-slate-400" aria-hidden="true" />
            <p className="mt-2 text-sm text-slate-600">
              Click or drag and drop to upload an image
            </p>
            <Button 
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={(e) => {
                e.stopPropagation();
                triggerFileInput();
              }}
            >
              Select File
            </Button>
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-rose-600" role="alert">{error}</p>
      )}
    </div>
  );
};

export default ImageUpload;