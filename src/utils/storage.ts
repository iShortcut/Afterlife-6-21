import { supabase } from '../lib/supabase';

/**
 * Uploads a file to the specified Supabase Storage bucket
 * @param bucket The storage bucket name
 * @param path The path within the bucket
 * @param file The file to upload
 * @param options Additional upload options
 * @returns The public URL of the uploaded file
 */
export const uploadFile = async (
  bucket: string,
  path: string,
  file: File,
  options?: {
    onProgress?: (progress: number) => void;
    contentType?: string;
    cacheControl?: string;
    upsert?: boolean;
  }
): Promise<string> => {
  try {
    // Upload the file
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: options?.cacheControl || '3600',
        contentType: options?.contentType || file.type,
        upsert: options?.upsert || false,
        ...(options?.onProgress ? {
          onUploadProgress: (progress) => {
            const percentage = Math.round((progress.loaded / progress.total) * 100);
            options.onProgress?.(percentage);
          }
        } : {})
      });

    if (error) throw error;

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    if (!urlData.publicUrl) {
      throw new Error('Failed to get public URL for uploaded file');
    }

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

/**
 * Deletes a file from Supabase Storage
 * @param bucket The storage bucket name
 * @param path The path within the bucket
 */
export const deleteFile = async (bucket: string, path: string): Promise<void> => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

/**
 * Gets the public URL for a file in Supabase Storage
 * @param bucket The storage bucket name
 * @param path The path within the bucket
 * @returns The public URL of the file
 */
export const getPublicUrl = (bucket: string, path: string): string => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
};

/**
 * Generates a unique file path for uploading to Supabase Storage
 * @param bucket The storage bucket name
 * @param entityId The ID of the entity (e.g., event ID, memorial ID)
 * @param file The file to upload
 * @returns A unique path for the file
 */
export const generateFilePath = (
  entityId: string,
  file: File
): string => {
  const timestamp = Date.now();
  const fileExt = file.name.split('.').pop();
  return `${entityId}/${timestamp}.${fileExt}`;
};