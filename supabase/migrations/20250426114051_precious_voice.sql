/*
  # Create API keys table

  1. New Tables
    - `api_keys`
      - `id` (uuid, primary key)
      - `created_at` (timestamptz)
      - `user_id` (uuid, references profiles)
      - `key_hash` (text, unique)
      - `key_prefix` (text, unique)
      - `label` (text, nullable)
      - `last_used_at` (timestamptz, nullable)
      - `expires_at` (timestamptz, nullable)
      - `scopes` (text array, nullable)
      - `is_active` (boolean)

  2. Security
    - Enable RLS
    - Add policies for users to manage their own API keys
*/

-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL UNIQUE,
  label text,
  last_used_at timestamptz,
  expires_at timestamptz,
  scopes text[],
  is_active boolean DEFAULT true
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow users manage own API keys" ON api_keys;

-- Create policies
CREATE POLICY "Allow users manage own API keys"
  ON api_keys
  FOR ALL
  TO public
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add comment
COMMENT ON TABLE api_keys IS 'Stores API keys for third-party developers.';
