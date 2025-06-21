/*
  # Create required storage buckets

  1. New Storage Buckets
    - `memorial-images` - For memorial profile and cover images
    - `media` - For general media uploads
    - `avatars` - For user profile avatars
    - `post-media` - For media attached to posts

  2. Security
    - Enable public access for viewing
    - Add RLS policies for uploads and management
*/

-- Create memorial-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('memorial-images', 'Memorial Images', true)
ON CONFLICT (id) DO NOTHING;

-- Create media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'Media Files', true)
ON CONFLICT (id) DO NOTHING;

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'User Avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create post-media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-media', 'Post Media', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for memorial-images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Public read access for memorial images'
  ) THEN
    CREATE POLICY "Public read access for memorial images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'memorial-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Authenticated users can upload memorial images'
  ) THEN
    CREATE POLICY "Authenticated users can upload memorial images"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'memorial-images'
        AND auth.role() = 'authenticated'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can update their own memorial images'
  ) THEN
    CREATE POLICY "Users can update their own memorial images"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'memorial-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can delete their own memorial images'
  ) THEN
    CREATE POLICY "Users can delete their own memorial images"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'memorial-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  -- Create storage policies for media
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Public read access for media'
  ) THEN
    CREATE POLICY "Public read access for media"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'media');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Authenticated users can upload media'
  ) THEN
    CREATE POLICY "Authenticated users can upload media"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'media'
        AND auth.role() = 'authenticated'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can update their own media'
  ) THEN
    CREATE POLICY "Users can update their own media"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'media'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can delete their own media'
  ) THEN
    CREATE POLICY "Users can delete their own media"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'media'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  -- Create storage policies for avatars
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Public read access for avatars'
  ) THEN
    CREATE POLICY "Public read access for avatars"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Authenticated users can upload avatars'
  ) THEN
    CREATE POLICY "Authenticated users can upload avatars"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'avatars'
        AND auth.role() = 'authenticated'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can update their own avatars'
  ) THEN
    CREATE POLICY "Users can update their own avatars"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can delete their own avatars'
  ) THEN
    CREATE POLICY "Users can delete their own avatars"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  -- Create storage policies for post-media
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Public read access for post media'
  ) THEN
    CREATE POLICY "Public read access for post media"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'post-media');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Authenticated users can upload post media'
  ) THEN
    CREATE POLICY "Authenticated users can upload post media"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'post-media'
        AND auth.role() = 'authenticated'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can update their own post media'
  ) THEN
    CREATE POLICY "Users can update their own post media"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'post-media'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can delete their own post media'
  ) THEN
    CREATE POLICY "Users can delete their own post media"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'post-media'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;