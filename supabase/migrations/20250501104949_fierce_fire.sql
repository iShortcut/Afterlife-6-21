/*
  # Create memorial-media storage bucket and RLS policies

  1. New Storage Bucket
    - `memorial-media` - For storing memorial-related media files

  2. Security
    - Public read access for all files
    - Authenticated users can upload files
    - Users can only update/delete their own files
*/

-- Create memorial-media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('memorial-media', 'Memorial Media', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for memorial-media bucket

-- Public read access
CREATE POLICY "Public read access for memorial media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'memorial-media');

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload memorial media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'memorial-media'
    AND auth.role() = 'authenticated'
  );

-- Users can update their own files
CREATE POLICY "Users can update their own memorial media"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'memorial-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own files
CREATE POLICY "Users can delete their own memorial media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'memorial-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Add comment explaining the bucket's purpose
COMMENT ON TABLE storage.objects IS 'Storage for memorial-related media files';