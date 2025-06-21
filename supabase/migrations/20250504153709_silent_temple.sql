/*
  # Add community groups functionality

  1. New Tables
    - `community_groups`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text, nullable)
      - `created_by` (uuid, references profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `privacy` (text: public, private, secret)
      - `cover_image_url` (text, nullable)

    - `group_members`
      - `id` (uuid, primary key)
      - `group_id` (uuid, references community_groups)
      - `user_id` (uuid, references profiles)
      - `role` (text: admin, moderator, member)
      - `joined_at` (timestamptz)

    - `group_posts`
      - `id` (uuid, primary key)
      - `group_id` (uuid, references community_groups)
      - `author_id` (uuid, references profiles)
      - `content` (text)
      - `media_ids` (uuid array)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for:
      - Public groups visible to everyone
      - Private groups visible to members
      - Secret groups visible only to members
      - Group admins can manage group settings
      - Group members can create posts
*/

-- Create community_groups table
CREATE TABLE IF NOT EXISTS community_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  privacy text NOT NULL CHECK (privacy IN ('public', 'private', 'secret')) DEFAULT 'public',
  cover_image_url text
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'moderator', 'member')) DEFAULT 'member',
  joined_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(group_id, user_id)
);

-- Create group_posts table
CREATE TABLE IF NOT EXISTS group_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  media_ids uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_community_groups_created_by ON community_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_community_groups_privacy ON community_groups(privacy);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_posts_group_id ON group_posts(group_id);
CREATE INDEX IF NOT EXISTS idx_group_posts_author_id ON group_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_group_posts_created_at ON group_posts(created_at);

-- Enable RLS
ALTER TABLE community_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_posts ENABLE ROW LEVEL SECURITY;

-- Create updated_at triggers
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON community_groups
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON group_posts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Create function to check if user is a group member
CREATE OR REPLACE FUNCTION is_group_member(group_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = $1
    AND user_id = $2
  );
END;
$$;

-- Create function to check if user is a group admin
CREATE OR REPLACE FUNCTION is_group_admin(group_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = $1
    AND user_id = $2
    AND role = 'admin'
  );
END;
$$;

-- Create function to check if user is a group moderator
CREATE OR REPLACE FUNCTION is_group_moderator(group_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = $1
    AND user_id = $2
    AND role IN ('admin', 'moderator')
  );
END;
$$;

-- Create policies for community_groups
CREATE POLICY "Anyone can view public groups"
  ON community_groups
  FOR SELECT
  USING (privacy = 'public');

CREATE POLICY "Members can view private and secret groups"
  ON community_groups
  FOR SELECT
  USING (
    is_group_member(id, auth.uid())
  );

CREATE POLICY "Authenticated users can create groups"
  ON community_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Group admins can update group settings"
  ON community_groups
  FOR UPDATE
  USING (
    is_group_admin(id, auth.uid())
  );

CREATE POLICY "Group admins can delete groups"
  ON community_groups
  FOR DELETE
  USING (
    is_group_admin(id, auth.uid())
  );

-- Create policies for group_members
CREATE POLICY "Anyone can view members of public groups"
  ON group_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM community_groups
      WHERE id = group_id
      AND privacy = 'public'
    )
  );

CREATE POLICY "Members can view members of their groups"
  ON group_members
  FOR SELECT
  USING (
    is_group_member(group_id, auth.uid())
  );

CREATE POLICY "Users can join public groups"
  ON group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM community_groups
      WHERE id = group_id
      AND privacy = 'public'
    )
  );

CREATE POLICY "Group admins can add members"
  ON group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_group_admin(group_id, auth.uid())
  );

CREATE POLICY "Group admins can update member roles"
  ON group_members
  FOR UPDATE
  USING (
    is_group_admin(group_id, auth.uid())
  );

CREATE POLICY "Group admins can remove members"
  ON group_members
  FOR DELETE
  USING (
    is_group_admin(group_id, auth.uid())
  );

CREATE POLICY "Users can leave groups"
  ON group_members
  FOR DELETE
  USING (
    user_id = auth.uid()
  );

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
    is_group_member(group_id, auth.uid())
  );

CREATE POLICY "Members can create posts in their groups"
  ON group_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid() AND
    is_group_member(group_id, auth.uid())
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
    is_group_moderator(group_id, auth.uid())
  );

-- Add comments
COMMENT ON TABLE community_groups IS 'Community groups for users to join and interact';
COMMENT ON TABLE group_members IS 'Members of community groups with their roles';
COMMENT ON TABLE group_posts IS 'Posts made within community groups';