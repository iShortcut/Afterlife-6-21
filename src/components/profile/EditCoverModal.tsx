// 📁 src/components/profile/EditCoverModal.tsx
import React, { useState } from 'react';
import Button from '../ui/Button';
import ImageUpload from '../ui/ImageUpload';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { X } from 'lucide-react';

interface EditCoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCoverImageUploaded: () => void;
}

const EditCoverModal: React.FC<EditCoverModalProps> = ({
  isOpen,
  onClose,
  onCoverImageUploaded,
}) => {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageChangeInternal = (file: File | null) => {
    setSelectedFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
    setError(null);
  };

  const handleSave = async () => {
    if (!selectedFile || !user || !user.id) {
      setError('User not available or please select an image to upload.');
      setIsUploading(false);
      return;
    }

    setIsUploading(true);
    setError(null);

    const originalFileName = selectedFile.name;
    const parts = originalFileName.split('.');
    const fileExt = parts.length > 1 ? String(parts.pop()).replace(/[^a-zA-Z0-9]/g, '') : 'tmp';
    const timestamp = String(Date.now());

    const cleanFileName = timestamp + "." + fileExt;
    const currentUserId = String(user.id);

    // Build path using an array and join to be absolutely sure about separators
    const pathParts = ['covers', currentUserId, cleanFileName];
    const filePath = pathParts.join('/');

    console.log('Final filePath for upload:', filePath);

    try {
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        throw new Error('Could not get public URL for the uploaded image.');
      }

      const newCoverUrl = publicUrlData.publicUrl;
      console.log('New cover URL:', newCoverUrl);

      const { error: updateError } = await supabase.auth.updateUser({
        data: { cover_image_url: newCoverUrl },
      });

      if (updateError) {
        console.error('Error updating user metadata:', updateError);
        await supabase.storage.from('media').remove([filePath]);
        throw updateError;
      }

      onCoverImageUploaded();
      onClose();
      setPreviewUrl(null);
      setSelectedFile(null);

    } catch (e: any) {
      console.error('Error in handleSave:', e);
      setError(e.message || 'Failed to upload cover image or update user profile. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const currentCoverUrl = user?.user_metadata?.cover_image_url || undefined;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[200] p-4 transition-opacity duration-300 ease-in-out"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-lg transform transition-all duration-300 ease-in-out scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Edit Cover Image
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close modal">
            <X size={20} className="text-slate-500 dark:text-slate-400" />
          </Button>
        </div>

        <ImageUpload
          onImageChange={handleImageChangeInternal}
          currentImageUrl={previewUrl || currentCoverUrl}
          label="Upload new cover image (Recommended: 820x360, max 5MB, JPG/PNG)"
          aspectRatio="aspect-[820/360]"
          fileTypes={['image/jpeg', 'image/png']}
          maxFileSizeMB={5}
        />

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isUploading || !selectedFile}>
            {isUploading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditCoverModal;