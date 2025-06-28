-- First, let's temporarily disable the trigger that's enforcing the memorial_id NOT NULL constraint
ALTER TABLE posts DISABLE TRIGGER check_post_permissions_and_status;

-- Make sure the memorial_id column allows NULL values
ALTER TABLE posts ALTER COLUMN memorial_id DROP NOT NULL;

-- Update the existing content check constraint to be more flexible
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_content_or_media_check;

-- Add a more flexible constraint that allows posts with just content or just media
ALTER TABLE posts ADD CONSTRAINT posts_content_or_media_check 
  CHECK (
    (content IS NOT NULL AND trim(content) != '') OR 
    (media_ids IS NOT NULL AND array_length(media_ids, 1) > 0)
  );

-- Create a new table for group posts instead of modifying the existing posts table
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
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON group_posts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Create policies for group_posts
CREATE POLICY "Anyone can view posts in public groups"
  ON group_posts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM community_groups
      WHERE id = group_id
      AND privacy = 'public'
    )
  );

CREATE POLICY "Members can view posts in their groups"
  ON group_posts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = group_posts.group_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create posts in their groups"
  ON group_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = group_posts.group_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Authors can update their own posts"
  ON group_posts
  FOR UPDATE
  USING (
    author_id = auth.uid()
  );

CREATE POLICY "Authors and moderators can delete posts"
  ON group_posts
  FOR DELETE
  USING (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = group_posts.group_id
      AND user_id = auth.uid()
      AND role IN ('ADMIN', 'MODERATOR')
    )
  );

-- Re-enable the trigger after all modifications
ALTER TABLE posts ENABLE TRIGGER check_post_permissions_and_status;

-- Add comment
COMMENT ON TABLE group_posts IS 'Posts made within community groups';