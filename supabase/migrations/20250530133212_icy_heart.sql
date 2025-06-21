/*
  # Add cover image URL to events table

  1. Changes
    - Add `cover_image_url` column to `events` table to store event cover image URLs
    - Column is nullable since not all events will have cover images
    - Type is TEXT to store full URLs

  2. Security
    - No changes to RLS policies needed as existing policies cover the new column
*/

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS cover_image_url TEXT DEFAULT NULL;

-- Add comment explaining the column's purpose
COMMENT ON COLUMN events.cover_image_url IS 'URL for the event cover image. Nullable since not all events require a cover image.';