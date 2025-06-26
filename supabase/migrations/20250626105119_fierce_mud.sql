/*
  # Event Media Storage Configuration
  
  1. New Storage Bucket
     - Creates a dedicated 'event_media' bucket for event-related media files
     - 50MB file size limit with specific allowed MIME types
  
  2. Security
     - Enables Row Level Security (RLS) on storage.objects
     - Creates policies for read, insert, update, and delete operations
     - Ensures only authorized users can access and modify event media
  
  3. Helper Functions
     - get_event_id_from_storage_path: Extracts event ID from storage path
     - can_access_event_media: Determines if a user can access event media
*/

-- Create the event_media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'event_media',
  'event_media',
  true,  -- public bucket
  false, -- no avif autodetection
  52428800, -- 50MB limit
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow public read access for event media
CREATE POLICY "Allow public read access for event media"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'event_media' AND (
    -- Check if the event is public
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = (
        -- Extract event ID from path (assuming format: event_media/{event_id}/...)
        -- Cast to UUID after extraction to ensure proper type comparison
        (regexp_match(storage.objects.name, '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/.*$'))[1]::uuid
      )
      AND e.visibility = 'public'
    )
    OR
    -- Or allow access to any authenticated user
    auth.role() = 'authenticated'
  )
);

-- Policy 2: Allow event owner to upload/update their media
CREATE POLICY "Allow event owner to upload/update their media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event_media' AND (
    -- Check if user is the event creator
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = (
        -- Extract event ID from path (assuming format: event_media/{event_id}/...)
        (regexp_match(storage.objects.name, '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/.*$'))[1]::uuid
      )
      AND e.creator_id = auth.uid()
    )
    OR
    -- Or check if user is an admin
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  )
);

-- Policy 3: Allow event owner to update their media
CREATE POLICY "Allow event owner to update their media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event_media' AND (
    -- Check if user is the event creator
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = (
        -- Extract event ID from path (assuming format: event_media/{event_id}/...)
        (regexp_match(storage.objects.name, '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/.*$'))[1]::uuid
      )
      AND e.creator_id = auth.uid()
    )
    OR
    -- Or check if user is an admin
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  )
);

-- Policy 4: Allow event owner to delete their media
CREATE POLICY "Allow event owner to delete their media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'event_media' AND (
    -- Check if user is the event creator
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = (
        -- Extract event ID from path (assuming format: event_media/{event_id}/...)
        (regexp_match(storage.objects.name, '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/.*$'))[1]::uuid
      )
      AND e.creator_id = auth.uid()
    )
    OR
    -- Or check if user is an admin
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  )
);

-- Create a helper function to get the event ID from a storage path
CREATE OR REPLACE FUNCTION public.get_event_id_from_storage_path(path text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT ((regexp_match(path, '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/.*$'))[1])::uuid;
$$;

-- Create a helper function to check if a user can access an event's media
CREATE OR REPLACE FUNCTION public.can_access_event_media(event_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  event_visibility text;
  event_creator_id uuid;
  is_attendee boolean;
BEGIN
  -- Get event details
  SELECT e.visibility::text, e.creator_id
  INTO event_visibility, event_creator_id
  FROM public.events e
  WHERE e.id = event_id;
  
  -- Check if user is an attendee
  SELECT EXISTS (
    SELECT 1 FROM public.event_attendees ea
    WHERE ea.event_id = event_id AND ea.user_id = user_id
  ) INTO is_attendee;
  
  -- Return true if:
  -- 1. Event is public, OR
  -- 2. User is the event creator, OR
  -- 3. User is an attendee
  RETURN 
    event_visibility = 'public' OR
    event_creator_id = user_id OR
    is_attendee;
END;
$$;