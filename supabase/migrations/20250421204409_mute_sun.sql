/*
  # Add media tracking table

  1. New Tables
    - `media`
      - `id` (uuid, primary key)
      - `uploader_id` (uuid, references auth.users)
      - `storage_path` (text)
      - `entity_id` (uuid)
      - `entity_type` (text)
      - `metadata` (jsonb)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on media table
    - Add policies for media access
*/

-- Create media table
CREATE TABLE public.media (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    uploader_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    storage_path text NOT NULL,
    entity_id uuid,
    entity_type text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- Media policies
CREATE POLICY "Users can view media they uploaded"
    ON public.media
    FOR SELECT
    TO public
    USING (auth.uid() = uploader_id);

CREATE POLICY "Users can insert their own media"
    ON public.media
    FOR INSERT
    TO public
    WITH CHECK (auth.uid() = uploader_id);