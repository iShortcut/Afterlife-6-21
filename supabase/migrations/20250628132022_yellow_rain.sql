/*
  # Fix Group Posts Memorial ID Constraint

  1. Schema Changes
    - Ensure memorial_id column in posts table allows NULL values
    - Update any existing constraints that might be preventing NULL values
    - Add check constraint to ensure either memorial_id OR group_id is present

  2. Security
    - Maintain existing RLS policies
    - Ensure data integrity with proper constraints
*/

-- First, let's make sure the memorial_id column allows NULL values
ALTER TABLE posts ALTER COLUMN memorial_id DROP NOT NULL;

-- Add a check constraint to ensure either memorial_id or group_id is present
-- This ensures posts are always associated with either a memorial or a group
ALTER TABLE posts ADD CONSTRAINT posts_memorial_or_group_check 
  CHECK (
    (memorial_id IS NOT NULL AND group_id IS NULL) OR 
    (memorial_id IS NULL AND group_id IS NOT NULL)
  );

-- Update the existing content check constraint to be more flexible
-- Posts should have either content OR media, but for group posts we want to be more lenient
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_content_or_media_check;

-- Add a more flexible constraint that allows posts with just content or just media
ALTER TABLE posts ADD CONSTRAINT posts_content_or_media_check 
  CHECK (
    (content IS NOT NULL AND trim(content) != '') OR 
    (media_ids IS NOT NULL AND array_length(media_ids, 1) > 0)
  );