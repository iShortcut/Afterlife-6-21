/*
  # Add user feedback table

  1. New Tables
    - `user_feedback`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles, nullable)
      - `feedback_type` (text)
      - `message` (text)
      - `context` (text)
      - `screenshot_url` (text, nullable)
      - `browser_info` (text, nullable)
      - `status` (text)
      - `created_at` (timestamptz)
      - `resolved_at` (timestamptz, nullable)
      - `resolved_by` (uuid, references profiles, nullable)
      - `resolution_notes` (text, nullable)

  2. Security
    - Enable RLS
    - Add policies for:
      - Users can view their own feedback
      - Users can create feedback
      - Admins can view and manage all feedback
*/

-- Create user_feedback table
CREATE TABLE IF NOT EXISTS user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  feedback_type text NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'improvement', 'other')),
  message text NOT NULL,
  context text,
  screenshot_url text,
  browser_info text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'rejected')),
  created_at timestamptz DEFAULT now() NOT NULL,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  resolution_notes text
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at);

-- Enable RLS
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own feedback"
  ON user_feedback
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create feedback"
  ON user_feedback
  FOR INSERT
  TO public
  WITH CHECK (
    (user_id IS NULL) OR 
    (auth.uid() = user_id)
  );

CREATE POLICY "Admins can view all feedback"
  ON user_feedback
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update feedback"
  ON user_feedback
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Add comment
COMMENT ON TABLE user_feedback IS 'Stores user feedback and bug reports';