/*
  # Add post comments for group posts

  1. New Tables
    - `group_post_comments` - Stores comments on group posts
      - `id` (uuid, primary key)
      - `post_id` (uuid, references group_posts)
      - `user_id` (uuid, references profiles)
      - `content` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on the new table
    - Add policies for viewing, creating, and deleting comments
*/

-- Create the group_post_comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS group_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES group_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT group_post_comments_content_check CHECK (length(trim(content)) > 0)
);

-- Create indexes for the group_post_comments table
CREATE INDEX IF NOT EXISTS idx_group_post_comments_post_id ON group_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_group_post_comments_user_id ON group_post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_group_post_comments_created_at ON group_post_comments(created_at);

-- Enable RLS on the table
ALTER TABLE group_post_comments ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger for group_post_comments
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_updated_at' 
    AND tgrelid = 'group_post_comments'::regclass
  ) THEN
    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON group_post_comments
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- Create policies for group_post_comments
DO $$
BEGIN
  -- Check if "Anyone can view comments on posts in public groups" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'group_post_comments' 
    AND policyname = 'Anyone can view comments on posts in public groups'
  ) THEN
    CREATE POLICY "Anyone can view comments on posts in public groups"
      ON group_post_comments
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM group_posts gp
          JOIN community_groups cg ON gp.group_id = cg.id
          WHERE gp.id = post_id
          AND cg.privacy = 'public'
        )
      );
  END IF;

  -- Check if "Group members can view comments on posts in their groups" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'group_post_comments' 
    AND policyname = 'Group members can view comments on posts in their groups'
  ) THEN
    CREATE POLICY "Group members can view comments on posts in their groups"
      ON group_post_comments
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM group_posts gp
          JOIN group_members gm ON gp.group_id = gm.group_id
          WHERE gp.id = post_id
          AND gm.user_id = auth.uid()
        )
      );
  END IF;

  -- Check if "Group members can create comments on posts in their groups" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'group_post_comments' 
    AND policyname = 'Group members can create comments on posts in their groups'
  ) THEN
    CREATE POLICY "Group members can create comments on posts in their groups"
      ON group_post_comments
      FOR INSERT
      WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
          SELECT 1 FROM group_posts gp
          JOIN group_members gm ON gp.group_id = gm.group_id
          WHERE gp.id = post_id
          AND gm.user_id = auth.uid()
        )
      );
  END IF;

  -- Check if "Users can delete their own comments" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'group_post_comments' 
    AND policyname = 'Users can delete their own comments'
  ) THEN
    CREATE POLICY "Users can delete their own comments"
      ON group_post_comments
      FOR DELETE
      USING (
        user_id = auth.uid()
      );
  END IF;

  -- Check if "Group moderators can delete any comment" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'group_post_comments' 
    AND policyname = 'Group moderators can delete any comment'
  ) THEN
    CREATE POLICY "Group moderators can delete any comment"
      ON group_post_comments
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM group_posts gp
          JOIN group_members gm ON gp.group_id = gm.group_id
          WHERE gp.id = post_id
          AND gm.user_id = auth.uid()
          AND gm.role IN ('ADMIN', 'MODERATOR')
        )
      );
  END IF;
END $$;

-- Add comment
COMMENT ON TABLE group_post_comments IS 'Comments on posts within community groups';