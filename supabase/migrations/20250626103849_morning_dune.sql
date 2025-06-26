/*
  # Add event hero media support
  
  1. New Types
    - Create `media_type_enum` with values 'image', 'video', 'default'
  
  2. Schema Changes
    - Add `hero_media_type` column to `events` table
    - Rename `cover_image_url` to `hero_media_url` in `events` table
  
  3. Data Migration
    - Update existing records to set `hero_media_type` to 'image' where `hero_media_url` is not null
*/

-- Create the media_type_enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'media_type_enum') THEN
    CREATE TYPE public.media_type_enum AS ENUM ('image', 'video', 'default');
  END IF;
END$$;

-- Add hero_media_type column
ALTER TABLE public.events 
ADD COLUMN hero_media_type media_type_enum DEFAULT 'default';

-- Rename cover_image_url to hero_media_url
ALTER TABLE public.events 
RENAME COLUMN cover_image_url TO hero_media_url;

-- Update existing data: set hero_media_type to 'image' where hero_media_url is not null
UPDATE public.events
SET hero_media_type = 'image'
WHERE hero_media_url IS NOT NULL AND hero_media_url != '';

-- No need to modify RLS policies as the existing policies for the events table
-- already handle access control for all columns including the new/renamed ones.
-- The existing UPDATE policy allows event creators to modify all fields.