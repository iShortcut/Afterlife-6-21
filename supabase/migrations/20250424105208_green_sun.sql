/*
  # Add timeline event categories and media support

  1. New Tables
    - `timeline_event_categories`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `created_at` (timestamptz)

  2. Changes
    - Add category_id to timeline_events table
    - Add media_urls array to timeline_events table
    - Update RLS policies

  3. Security
    - Enable RLS on categories table
    - Add policies for public read access
*/

-- Create timeline_event_categories table
CREATE TABLE IF NOT EXISTS timeline_event_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Add some default categories
INSERT INTO timeline_event_categories (name, description) VALUES
('Life Event', 'Major life milestones and achievements'),
('Education', 'Academic achievements and educational milestones'),
('Career', 'Professional accomplishments and work history'),
('Family', 'Family-related events and celebrations'),
('Travel', 'Significant trips and travel experiences'),
('Other', 'Other notable events');

-- Add category_id to timeline_events
ALTER TABLE timeline_events 
ADD COLUMN category_id uuid REFERENCES timeline_event_categories(id);

-- Enable RLS on categories
ALTER TABLE timeline_event_categories ENABLE ROW LEVEL SECURITY;

-- Add public read access to categories
CREATE POLICY "Anyone can view event categories"
  ON timeline_event_categories
  FOR SELECT
  TO public
  USING (true);

-- Update timeline_events policies to include category info
DROP POLICY IF EXISTS "Public read access for events on public memorials" ON timeline_events;
DROP POLICY IF EXISTS "Memorial owners can manage their memorial's events" ON timeline_events;
DROP POLICY IF EXISTS "Event creators can manage their events" ON timeline_events;

CREATE POLICY "Public read access for events on public memorials"
  ON timeline_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memorials
      WHERE memorials.id = timeline_events.memorial_id
      AND memorials.visibility = 'public'
    )
  );

CREATE POLICY "Memorial owners can manage their memorial's events"
  ON timeline_events
  FOR ALL
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
  USING (created_by = auth.uid());

-- Add comment
COMMENT ON TABLE timeline_event_categories IS 'Categories for timeline events';