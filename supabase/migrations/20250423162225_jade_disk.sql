/*
  # Add post comments functionality

  1. New Tables
    - `post_comments`
      - `id` (uuid, primary key)
      - `post_id` (uuid, FK to posts)
      - `user_id` (uuid, FK to profiles)
      - `content` (text)
      - `parent_comment_id` (uuid, self-referencing FK)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for:
      - Public read access based on post visibility
      - Authenticated users can create comments
      - Users can manage their own comments
*/

-- Create post_comments table
CREATE TABLE IF NOT EXISTS post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(trim(content)) > 0),
  parent_comment_id uuid REFERENCES post_comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX idx_post_comments_parent_comment_id ON post_comments(parent_comment_id);

-- Enable RLS
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view comments on public posts"
  ON post_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE id = post_id
      AND visibility = 'public'
    )
  );

CREATE POLICY "Users can view comments on their own posts"
  ON post_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE id = post_id
      AND author_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create comments"
  ON post_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE id = post_id
      AND (
        visibility = 'public'
        OR author_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own comments"
  ON post_comments
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON post_comments
  FOR DELETE
  USING (user_id = auth.uid());

-- Add comment
COMMENT ON TABLE post_comments IS 'Comments on posts with optional threading support';