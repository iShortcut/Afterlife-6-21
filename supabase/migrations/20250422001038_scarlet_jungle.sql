/*
  # Create timeline_events table

  1. New Tables
    - `timeline_events`
      - `id` (uuid, primary key)
      - `memorial_id` (uuid, references memorials)
      - `title` (text)
      - `description` (text, nullable)
      - `event_date` (date)
      - `media_ids` (uuid[], nullable)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for public access and owner management
*/

-- Create timeline_events table
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

-- Create updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON timeline_events
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Create index for faster queries
CREATE INDEX timeline_events_memorial_id_idx ON timeline_events(memorial_id);
CREATE INDEX timeline_events_event_date_idx ON timeline_events(event_date);