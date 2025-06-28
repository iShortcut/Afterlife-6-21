-- This migration adds RLS policies for the group_posts table

-- Create policies for group_posts
DO $$
BEGIN
  -- Policy 1: Anyone can view posts in public groups
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Anyone can view posts in public groups' 
    AND polrelid = 'group_posts'::regclass
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

  -- Policy 2: Members can view posts in their groups
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Members can view posts in their groups' 
    AND polrelid = 'group_posts'::regclass
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

  -- Policy 3: Members can create posts in their groups
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Members can create posts in their groups' 
    AND polrelid = 'group_posts'::regclass
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

  -- Policy 4: Authors can update their own posts
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Authors can update their own posts' 
    AND polrelid = 'group_posts'::regclass
  ) THEN
    CREATE POLICY "Authors can update their own posts"
      ON group_posts
      FOR UPDATE
      USING (
        author_id = auth.uid()
      );
  END IF;

  -- Policy 5: Authors and moderators can delete posts
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Authors and moderators can delete posts' 
    AND polrelid = 'group_posts'::regclass
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

-- Add comment
COMMENT ON TABLE group_posts IS 'Posts made within community groups';