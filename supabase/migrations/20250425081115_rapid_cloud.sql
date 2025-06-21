/*
  # Add moderation reports table

  1. New Tables
    - `moderation_reports`
      - `id` (uuid, primary key)
      - `reporter_id` (uuid, references profiles)
      - `reported_user_id` (uuid, references profiles, nullable)
      - `content_type` (text)
      - `content_id` (text)
      - `reason` (text)
      - `details` (text, nullable)
      - `status` (text)
      - `created_at` (timestamptz)
      - `reviewed_by` (uuid, references profiles, nullable)
      - `reviewed_at` (timestamptz, nullable)

  2. Security
    - Enable RLS
    - Add policies for:
      - Users can view their own reports
      - Users can create reports
      - Admins can view and manage all reports
*/

-- Create moderation_reports table
CREATE TABLE IF NOT EXISTS moderation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reported_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  content_type text NOT NULL CHECK (content_type IN ('POST', 'COMMENT', 'TRIBUTE', 'MEMORIAL', 'PROFILE')),
  content_id text NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REVIEWED_ACCEPTED', 'REVIEWED_REJECTED', 'ACTION_TAKEN')),
  created_at timestamptz DEFAULT now() NOT NULL,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz
);

-- Create indexes
CREATE INDEX idx_moderation_reports_reporter_id ON moderation_reports(reporter_id);
CREATE INDEX idx_moderation_reports_reported_user_id ON moderation_reports(reported_user_id);
CREATE INDEX idx_moderation_reports_status ON moderation_reports(status);
CREATE INDEX idx_moderation_reports_content_type_content_id ON moderation_reports(content_type, content_id);

-- Enable RLS
ALTER TABLE moderation_reports ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own reports"
  ON moderation_reports
  FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "Users can create reports"
  ON moderation_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Admins can view all reports"
  ON moderation_reports
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update reports"
  ON moderation_reports
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Add comment
COMMENT ON TABLE moderation_reports IS 'User-submitted reports for content moderation';