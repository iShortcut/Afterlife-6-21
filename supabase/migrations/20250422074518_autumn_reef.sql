/*
  # Timeline Events Schema

  1. New Tables
    - `timeline_events`
      - `id` (uuid, primary key)
      - `memorial_id` (uuid, references memorials)
      - `title` (text)
      - `description` (text, nullable)
      - `event_date` (date)
      - `media_ids` (uuid array)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for public read access and owner management
    
  3. Indexes
    - On memorial_id for faster lookups
    - On event_date for chronological sorting
*/

-- Create timeline_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid NOT NULL REFERENCES memorials(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_date date NOT NULL,
  media_ids uuid[] DEFAULT '{}',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Public read access for events on public memorials" ON timeline_events;
  DROP POLICY IF EXISTS "Memorial owners can manage their memorial's events" ON timeline_events;
  DROP POLICY IF EXISTS "Event creators can manage their events" ON timeline_events;
END $$;

-- Create policies
CREATE POLICY "Public read access for events on public memorials"
  ON timeline_events
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM memorials
      WHERE memorials.id = timeline_events.memorial_id
      AND memorials.is_public = true
    )
  );

CREATE POLICY "Memorial owners can manage their memorial's events"
  ON timeline_events
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM memorials
      WHERE memorials.id = timeline_events.memorial_id
      AND memorials.owner_id = auth.uid()
    )
  );

CREATE POLICY "Event creators can manage their events"
  ON timeline_events
  FOR ALL
  TO public
  USING (created_by = auth.uid());

-- Create updated_at trigger if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_updated_at' 
    AND tgrelid = 'timeline_events'::regclass
  ) THEN
    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON timeline_events
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- Create indexes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c 
    JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE c.relname = 'timeline_events_memorial_id_idx' 
    AND n.nspname = 'public'
  ) THEN
    CREATE INDEX timeline_events_memorial_id_idx ON timeline_events(memorial_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c 
    JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE c.relname = 'timeline_events_event_date_idx' 
    AND n.nspname = 'public'
  ) THEN
    CREATE INDEX timeline_events_event_date_idx ON timeline_events(event_date);
  END IF;
END $$;