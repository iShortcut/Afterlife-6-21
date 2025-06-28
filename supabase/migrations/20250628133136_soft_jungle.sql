-- This migration creates a separate table for group posts instead of modifying the posts table
-- This approach avoids conflicts with existing constraints and triggers

-- Create a new table for group posts
CREATE TABLE IF NOT EXISTS group_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text,
  media_ids uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT group_posts_content_or_media_check CHECK (
    (content IS NOT NULL AND trim(content) != '') OR 
    (media_ids IS NOT NULL AND array_length(media_ids, 1) > 0)
  )
);

-- Create indexes for the new group_posts table
CREATE INDEX IF NOT EXISTS idx_group_posts_group_id ON group_posts(group_id);
CREATE INDEX IF NOT EXISTS idx_group_posts_author_id ON group_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_group_posts_created_at ON group_posts(created_at);

-- Enable RLS on the new table
ALTER TABLE group_posts ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger for group_posts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_updated_at' 
    AND tgrelid = 'group_posts'::regclass
  ) THEN
    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON group_posts
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;