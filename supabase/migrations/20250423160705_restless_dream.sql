/*
  # Add post media support
  
  1. New Tables
    - `post_media`
      - `id` (uuid, primary key)
      - `post_id` (uuid, references posts)
      - `storage_object_path` (text, unique)
      - `media_type` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for:
      - Users can insert media for their own posts
      - Users can delete their own media
      - Public read access based on post visibility
*/

-- Create post_media table
CREATE TABLE IF NOT EXISTS post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  storage_object_path text UNIQUE NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_post_media_post_id ON post_media(post_id);

-- Enable RLS
ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert media for their own posts"
  ON post_media
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE id = post_id 
      AND author_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own media"
  ON post_media
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE id = post_id 
      AND author_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view media based on post visibility"
  ON post_media
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE id = post_id 
      AND visibility = 'public'
    )
  );

-- Create storage bucket for post media
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-media', 'Post Media', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Anyone can view post media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-media');

CREATE POLICY "Authenticated users can upload post media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-media'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete their own post media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'post-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Add comments
COMMENT ON TABLE post_media IS 'Stores media attachments for posts';
COMMENT ON COLUMN post_media.storage_object_path IS 'Path to media file in storage bucket';
COMMENT ON COLUMN post_media.media_type IS 'Type of media (image or video)';