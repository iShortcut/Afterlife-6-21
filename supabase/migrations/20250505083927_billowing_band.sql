/*
  # Add chatbot interactions table

  1. New Tables
    - `chatbot_interactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `query` (text)
      - `response` (text)
      - `timestamp` (timestamptz)
      - `feedback` (text, nullable)
      - `metadata` (jsonb)

  2. Security
    - Enable RLS
    - Add policies for:
      - Users can view their own interactions
      - Service role can insert interactions
      - Admins can view all interactions
*/

-- Create chatbot_interactions table
CREATE TABLE IF NOT EXISTS chatbot_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  query text NOT NULL,
  response text NOT NULL,
  timestamp timestamptz DEFAULT now() NOT NULL,
  feedback text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chatbot_interactions_user_id ON chatbot_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_interactions_timestamp ON chatbot_interactions(timestamp);

-- Enable RLS
ALTER TABLE chatbot_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own chatbot interactions"
  ON chatbot_interactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can insert chatbot interactions"
  ON chatbot_interactions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Admins can view all chatbot interactions"
  ON chatbot_interactions
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- Add comment
COMMENT ON TABLE chatbot_interactions IS 'Stores user interactions with the AI chatbot for analysis and improvement.';