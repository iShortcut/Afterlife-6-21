/*
  # Add location_type column to events table
  
  1. Changes
    - Add location_type column to events table with allowed values 'physical' and 'online'
    - Set default value to 'physical'
    - Add check constraint to ensure valid values
    - Rename location column to location_text for consistency
*/

-- Create enum type for event location types
DO $$ BEGIN
  CREATE TYPE event_location_type AS ENUM ('physical', 'online');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add location_type column
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS location_type event_location_type NOT NULL DEFAULT 'physical';

-- Rename location to location_text if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'events' 
    AND column_name = 'location'
  ) THEN
    ALTER TABLE events RENAME COLUMN location TO location_text;
  END IF;
END $$;