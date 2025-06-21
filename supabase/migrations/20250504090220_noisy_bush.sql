/*
  # Add memorial_candles table

  1. New Tables
    - `memorial_candles`
      - `id` (uuid, primary key)
      - `memorial_id` (uuid, references memorials)
      - `lit_by_id` (uuid, references auth.users)
      - `lit_by_name` (text)
      - `lit_at` (timestamptz)
      - `expires_at` (timestamptz)
      - `message` (text, nullable)

  2. Security
    - Enable RLS
    - Add policies for:
      - Public read access based on memorial visibility
      - Authenticated users can create candles
*/

-- Create memorial_candles table
CREATE TABLE IF NOT EXISTS memorial_candles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid NOT NULL REFERENCES memorials(id) ON DELETE CASCADE,
  lit_by_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  lit_by_name text NOT NULL,
  lit_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  message text
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_memorial_candles_memorial_id ON memorial_candles(memorial_id);
CREATE INDEX IF NOT EXISTS idx_memorial_candles_lit_by_id ON memorial_candles(lit_by_id);
CREATE INDEX IF NOT EXISTS idx_memorial_candles_expires_at ON memorial_candles(expires_at);

-- Enable RLS
ALTER TABLE memorial_candles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view candles on public memorials"
  ON memorial_candles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memorials
      WHERE memorials.id = memorial_candles.memorial_id
      AND memorials.visibility = 'public'
    )
  );

CREATE POLICY "Memorial owners can view all candles"
  ON memorial_candles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memorials
      WHERE memorials.id = memorial_candles.memorial_id
      AND memorials.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own candles"
  ON memorial_candles
  FOR SELECT
  USING (lit_by_id = auth.uid());

CREATE POLICY "Service role can create candles"
  ON memorial_candles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE memorial_candles IS 'Digital candles lit for memorials';