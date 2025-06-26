s by using a helper function to prevent syntax errors.

-- Create the event_media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'event_media',
  'event_media',
  true,
  false,
  52428800, -- 50MB limit
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security on storage objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 1. Create a helper function to reliably get the event ID from a storage path
DROP FUNCTION IF EXISTS public.get_event_id_from_storage_path(text);
CREATE OR REPLACE FUNCTION public.get_event_id_from_storage_path(path text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE -- Changed to IMMUTABLE as the function is deterministic
AS $$
  -- Correctly wrapped regexp_match to prevent syntax error
  SELECT (regexp_match(path, '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/.*$'))[1]::uuid;
$$;

-- 2. Create simplified and correct RLS policies using the helper function

-- Policy for Public Read Access
DROP POLICY IF EXISTS "Allow public read access for event media" ON storage.objects;
CREATE POLICY "Allow public read access for event media"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'event_media' AND (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = public.get_event_id_from_storage_path(storage.objects.name)
      AND e.visibility = 'public'
    )
  )
);

-- Policy for Authenticated Users (Covers INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Allow event owner to manage their media" ON storage.objects;
CREATE POLICY "Allow event owner to manage their media"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'event_media' AND (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = public.get_event_id_from_storage_path(storage.objects.name)
      AND e.creator_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  )
)
-- [FINAL-FIX] Simplifies RLS policies by using a helper function to prevent syntax errors.

-- Create the event_media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'event_media',
  'event_media',
  true,
  false,
  52428800, -- 50MB limit
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security on storage objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 1. Create a helper function to reliably get the event ID from a storage path
DROP FUNCTION IF EXISTS public.get_event_id_from_storage_path(text);
CREATE OR REPLACE FUNCTION public.get_event_id_from_storage_path(path text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE -- Changed to IMMUTABLE as the function is deterministic
AS $$
  -- Correctly wrapped regexp_match to prevent syntax error
  SELECT (regexp_match(path, '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/.*$'))[1]::uuid;
$$;

-- 2. Create simplified and correct RLS policies using the helper function

-- Policy for Public Read Access
DROP POLICY IF EXISTS "Allow public read access for event media" ON storage.objects;
CREATE POLICY "Allow public read access for event media"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'event_media' AND (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = public.get_event_id_from_storage_path(storage.objects.name)
      AND e.visibility = 'public'
    )
  )
);

-- Policy for Authenticated Users (Covers INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Allow event owner to manage their media" ON storage.objects;
CREATE POLICY "Allow event owner to manage their media"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'event_media' AND (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = public.get_event_id_from_storage_path(storage.objects.name)
      AND e.creator_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  )
)
WITH CHECK (
  bucket_id = 'event_media' AND (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = public.get_event_id_from_storage_path(storage.objects.name)
      AND e.creator_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  )
);

