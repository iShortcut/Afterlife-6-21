-- Add location coordinates to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS location_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location_longitude DOUBLE PRECISION;

-- Add comment explaining the columns
COMMENT ON COLUMN events.location_latitude IS 'Latitude coordinate for the event location';
COMMENT ON COLUMN events.location_longitude IS 'Longitude coordinate for the event location';