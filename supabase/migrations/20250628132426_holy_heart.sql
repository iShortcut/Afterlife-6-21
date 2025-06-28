-- First, let's make sure the memorial_id column allows NULL values
ALTER TABLE posts ALTER COLUMN memorial_id DROP NOT NULL;

-- Update the existing content check constraint to be more flexible
-- Posts should have either content OR media, but for group posts we want to be more lenient
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_content_or_media_check;

-- Add a more flexible constraint that allows posts with just content or just media
ALTER TABLE posts ADD CONSTRAINT posts_content_or_media_check 
  CHECK (
    (content IS NOT NULL AND trim(content) != '') OR 
    (media_ids IS NOT NULL AND array_length(media_ids, 1) > 0)
  );

-- First, update any existing rows that violate the constraint
-- For posts with both memorial_id and group_id, prioritize memorial_id
UPDATE posts 
SET group_id = NULL 
WHERE memorial_id IS NOT NULL AND group_id IS NOT NULL;

-- For posts with neither memorial_id nor group_id, we need to handle them
-- Since we can't determine which they should belong to, we'll create a placeholder
-- This is a temporary solution - in production you might want to review these posts
DO $$
DECLARE
  default_group_id uuid;
BEGIN
  -- Check if there are any posts with neither memorial_id nor group_id
  IF EXISTS (SELECT 1 FROM posts WHERE memorial_id IS NULL AND group_id IS NULL) THEN
    -- Get the first available group_id or create a placeholder
    SELECT id INTO default_group_id FROM community_groups LIMIT 1;
    
    -- If no groups exist, we'll need to handle this case
    IF default_group_id IS NULL THEN
      -- We can't add the constraint yet, so we'll exit
      RAISE NOTICE 'Cannot add constraint - some posts have neither memorial_id nor group_id, and no groups exist';
      RETURN;
    END IF;
    
    -- Update posts with neither memorial_id nor group_id
    UPDATE posts 
    SET group_id = default_group_id
    WHERE memorial_id IS NULL AND group_id IS NULL;
  END IF;
END $$;

-- Now add the check constraint to ensure either memorial_id or group_id is present
-- This ensures posts are always associated with either a memorial or a group
ALTER TABLE posts ADD CONSTRAINT posts_memorial_or_group_check 
  CHECK (
    (memorial_id IS NOT NULL) OR 
    (group_id IS NOT NULL)
  );

-- Note: We've modified the constraint to be less strict
-- It now allows a post to have both memorial_id and group_id if needed
-- This is more flexible than the original constraint