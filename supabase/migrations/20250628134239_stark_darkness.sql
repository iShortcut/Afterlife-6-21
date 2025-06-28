/*
  # Fix group_posts migration

  1. New Tables
    - No new tables, just ensuring group_posts exists with proper configuration
  2. Security
    - Ensures RLS is enabled on group_posts table
    - Adds policies for group_posts if they don't already exist
*/

-- Create a new table for group posts if it doesn't exist
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

-- Create indexes for the group_posts table if they don't exist
CREATE INDEX IF NOT EXISTS idx_group_posts_group_id ON group_posts(group_id);
CREATE INDEX IF NOT EXISTS idx_group_posts_author_id ON group_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_group_posts_created_at ON group_posts(created_at);

-- Enable RLS on the table
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

-- Create policies for group_posts if they don't exist
DO $$
BEGIN
  -- Check if "Anyone can view posts in public groups" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'group_posts' 
    AND policyname = 'Anyone can view posts in public groups'
  ) THEN
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
  END IF;

  -- Check if "Members can view posts in their groups" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'group_posts' 
    AND policyname = 'Members can view posts in their groups'
  ) THEN
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
  END IF;

  -- Check if "Members can create posts in their groups" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'group_posts' 
    AND policyname = 'Members can create posts in their groups'
  ) THEN
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
  END IF;

  -- Check if "Authors can update their own posts" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'group_posts' 
    AND policyname = 'Authors can update their own posts'
  ) THEN
    CREATE POLICY "Authors can update their own posts"
      ON group_posts
      FOR UPDATE
      USING (
        author_id = auth.uid()
      );
  END IF;

  -- Check if "Authors and moderators can delete posts" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'group_posts' 
    AND policyname = 'Authors and moderators can delete posts'
  ) THEN
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
  END IF;
END $$;

-- Add comment if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_description 
    WHERE objoid = 'group_posts'::regclass 
    AND objsubid = 0
  ) THEN
    COMMENT ON TABLE group_posts IS 'Posts made within community groups';
  END IF;
END $$;