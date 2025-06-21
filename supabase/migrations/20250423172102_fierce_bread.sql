/*
  # Create user blocks table and related functionality

  1. New Tables
    - `user_blocks`
      - `blocker_user_id` (uuid, FK to profiles)
      - `blocked_user_id` (uuid, FK to profiles)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for managing blocks
    - Add function to check if user is blocked

  3. Indexes
    - On blocker_user_id for quick lookups
    - On blocked_user_id for filtering
*/

-- Create user_blocks table
CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (blocker_user_id, blocked_user_id),
  -- Prevent self-blocking
  CONSTRAINT no_self_block CHECK (blocker_user_id != blocked_user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_user_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_user_id);

-- Enable RLS
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own blocks"
  ON user_blocks
  FOR SELECT
  TO public
  USING (blocker_user_id = auth.uid());

CREATE POLICY "Users can create blocks"
  ON user_blocks
  FOR INSERT
  TO public
  WITH CHECK (blocker_user_id = auth.uid());

CREATE POLICY "Users can remove their own blocks"
  ON user_blocks
  FOR DELETE
  TO public
  USING (blocker_user_id = auth.uid());

-- Create function to check if user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(user_id uuid, by_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_blocks
    WHERE (blocker_user_id = by_user_id AND blocked_user_id = user_id)
    OR (blocker_user_id = user_id AND blocked_user_id = by_user_id)
  );
END;
$$;

-- Update get_news_feed function to exclude blocked users
CREATE OR REPLACE FUNCTION get_news_feed(current_user_id uuid)
RETURNS TABLE (
  id uuid,
  content text,
  created_at timestamptz,
  visibility text,
  author_id uuid,
  memorial_id uuid
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH friend_ids AS (
    SELECT user2_id AS friend_id
    FROM user_connections
    WHERE user1_id = current_user_id AND status = 'ACCEPTED'
    UNION
    SELECT user1_id AS friend_id
    FROM user_connections
    WHERE user2_id = current_user_id AND status = 'ACCEPTED'
  )
  SELECT DISTINCT p.id, p.content, p.created_at, p.visibility, p.author_id, p.memorial_id
  FROM posts p
  WHERE
    -- Not blocked
    NOT EXISTS (
      SELECT 1 FROM user_blocks ub
      WHERE (ub.blocker_user_id = current_user_id AND ub.blocked_user_id = p.author_id)
      OR (ub.blocker_user_id = p.author_id AND ub.blocked_user_id = current_user_id)
    )
    AND (
      -- Include posts from friends
      (p.author_id IN (SELECT friend_id FROM friend_ids) AND p.visibility IN ('public', 'friends_only'))
      -- Include public posts
      OR (p.visibility = 'public')
      -- Always include user's own posts
      OR p.author_id = current_user_id
    )
  ORDER BY p.created_at DESC;
$$;

-- Add comment
COMMENT ON TABLE user_blocks IS 'Tracks user blocking relationships';