/*
  # Add memorial followers functionality

  1. New Tables
    - `memorial_followers`
      - `memorial_id` (uuid, FK to memorials)
      - `user_id` (uuid, FK to auth.users)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for:
      - Users can follow/unfollow memorials
      - Users can view their own follows
      - Public access for follower counts
*/

-- Create memorial_followers table
CREATE TABLE IF NOT EXISTS memorial_followers (
  memorial_id uuid NOT NULL REFERENCES memorials(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (memorial_id, user_id)
);

-- Create indexes
CREATE INDEX idx_memorial_followers_memorial_id ON memorial_followers(memorial_id);
CREATE INDEX idx_memorial_followers_user_id ON memorial_followers(user_id);

-- Enable RLS
ALTER TABLE memorial_followers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own follows"
  ON memorial_followers
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can view follower counts"
  ON memorial_followers
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM memorials m
      WHERE m.id = memorial_id
      AND (
        m.visibility = 'public'
        OR m.owner_id = auth.uid()
        OR (
          m.visibility = 'friends_only'
          AND EXISTS (
            SELECT 1 FROM user_connections uc
            WHERE (
              (uc.user1_id = m.owner_id AND uc.user2_id = auth.uid())
              OR (uc.user2_id = m.owner_id AND uc.user1_id = auth.uid())
            )
            AND uc.status = 'ACCEPTED'
          )
        )
        OR (
          m.visibility = 'family_only'
          AND is_family_member(m.id, auth.uid())
        )
      )
    )
  );

-- Create function to check if user follows memorial
CREATE OR REPLACE FUNCTION is_following_memorial(memorial_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM memorial_followers
    WHERE memorial_id = $1
    AND user_id = $2
  );
END;
$$;

-- Add comments
COMMENT ON TABLE memorial_followers IS 'Tracks which users follow which memorials';
COMMENT ON FUNCTION is_following_memorial(uuid, uuid) IS 'Checks if a user follows a specific memorial';