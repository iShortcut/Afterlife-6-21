import React, { useState } from 'react';
import { Image as ImageIcon, Video, X, Upload, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface EventMediaUploadProps {
  eventId: string;
  onUploadComplete?: (mediaUrl: string, mediaType: 'image' | 'video') => void;
  className?: string;
  maxFileSizeMB?: number;
  acceptedFileTypes?: string;
}

const EventMediaUpload: React.FC<EventMediaUploadProps> = ({
  eventId,
  onUploadComplete,
  className = '',
  maxFileSizeMB = 10,
  acceptedFileTypes = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm'
}) => {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    
    if (file) {
      // Check file size
      if (file.size > maxFileSizeMB * 1024 * 1024) {
        setError(`File size exceeds the ${maxFileSizeMB}MB limit`);
        return;
      }
      
      // Check file type
      if (!acceptedFileTypes.split(',').includes(file.type)) {
        setError(`File type ${file.type} is not supported`);
        return;
      }
      
      setSelectedFile(file);
      setError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setPreview(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      // Check file size
      if (file.size > maxFileSizeMB * 1024 * 1024) {
        setError(`File size exceeds the ${maxFileSizeMB}MB limit`);
        return;
      }
      
      // Check file type
      if (!acceptedFileTypes.split(',').includes(file.type)) {
        setError(`File type ${file.type} is not supported`);
        return;
      }
      
      setSelectedFile(file);
      setError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!user || !selectedFile || !eventId) {
      setError('Missing required information for upload');
      return;
    }
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);
      
      // Determine media type
      const isVideo = selectedFile.type.startsWith('video/');
      const mediaType = isVideo ? 'video' : 'image';
      
      // Create a unique filename
      const timestamp = Date.now();
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${timestamp}.${fileExt}`;
      const filePath = `${eventId}/${fileName}`;
      
      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('event_media')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            const percentage = Math.round((progress.loaded / progress.total) * 100);
            setUploadProgress(percentage);
          }
        });
        
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('event_media')
        .getPublicUrl(filePath);
        
      if (!publicUrlData.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }
      
      // Update event with new media URL if it's for the hero image
      if (onUploadComplete) {
        onUploadComplete(publicUrlData.publicUrl, mediaType as 'image' | 'video');
      }
      
      // Create media record in the database
      const { error: mediaError } = await supabase
        .from('media')
        .insert({
          uploader_id: user.id,
          storage_path: filePath,
          entity_type: 'event',
          entity_id: eventId,
          metadata: {
            file_name: selectedFile.name,
            file_size: selectedFile.size,
            file_type: selectedFile.type,
            media_type: mediaType
          }
        });
        
      if (mediaError) {
        console.error('Error creating media record:', mediaError);
        // Don't throw here, as the upload was successful
      }
      
      toast.success(`${mediaType === 'video' ? 'Video' : 'Image'} uploaded successfully`);
      
      // Reset state
      setSelectedFile(null);
      setPreview(null);
      
    } catch (err) {
      console.error('Error uploading file:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file');
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const getFileTypeIcon = () => {
    if (!selectedFile) return <Upload className="h-12 w-12 text-slate-400" />;
    
    return selectedFile.type.startsWith('video/') 
      ? <Video className="h-12 w-12 text-indigo-400" />
      : <ImageIcon className="h-12 w-12 text-indigo-400" />;
  };

  return (
    <div className={`${className}`}>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        Upload Media
      </label>
      
      {!selectedFile ? (
        <div
          className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md hover:border-indigo-400 transition-colors cursor-pointer"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => document.getElementById('event-media-upload')?.click()}
        >
          <div className="space-y-1 text-center">
            {getFileTypeIcon()}
            <div className="flex text-sm text-slate-600">
              <p className="pl-1">
                Drag and drop or click to select a file
              </p>
            </div>
            <p className="text-xs text-slate-500">
              Images (PNG, JPG, GIF, WEBP) or Videos (MP4, WEBM) up to {maxFileSizeMB}MB
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-1 relative">
          {selectedFile.type.startsWith('video/') ? (
            <video
              src={preview || undefined}
              controls
              className="max-h-48 w-full object-cover rounded-md"
            />
          ) : (
            <img 
              src={preview || undefined} 
              alt="Preview" 
              className="max-h-48 w-full object-cover rounded-md"
            />
          )}
          
          <button
            type="button"
            onClick={removeFile}
            className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-rose-100"
          >
            <X size={16} className="text-rose-600" />
          </button>
          
          <div className="mt-2 flex justify-end">
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              isLoading={isUploading}
              className="flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Uploading... {uploadProgress}%</span>
                </>
              ) : (
                <>
                  <Upload size={16} />
                  <span>Upload</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}
      
      <input
        id="event-media-upload"
        type="file"
        accept={acceptedFileTypes}
        className="sr-only"
        onChange={handleFileChange}
      />
      
      {error && (
        <p className="mt-1 text-sm text-rose-600">{error}</p>
      )}
    </div>
  );
};

export default EventMediaUpload;