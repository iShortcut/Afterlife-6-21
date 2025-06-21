/*
  # Create memorial views tracking

  1. New Tables
    - `memorial_views`
      - `id` (uuid, primary key)
      - `memorial_id` (uuid, references memorials)
      - `viewer_id` (uuid, references auth.users)
      - `viewed_at` (timestamptz)
      - `ip_hash` (text, for anonymous view tracking)
      - `user_agent` (text)

  2. Security
    - Enable RLS
    - Allow public insert for view tracking
    - Restrict select based on memorial visibility
*/

-- Create memorial_views table
CREATE TABLE IF NOT EXISTS memorial_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid NOT NULL REFERENCES memorials(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at timestamptz DEFAULT now() NOT NULL,
  ip_hash text,
  user_agent text,
  CONSTRAINT viewer_info_required CHECK (
    (viewer_id IS NOT NULL) OR (ip_hash IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX idx_memorial_views_memorial_id ON memorial_views(memorial_id);
CREATE INDEX idx_memorial_views_viewer_id ON memorial_views(viewer_id);
CREATE INDEX idx_memorial_views_viewed_at ON memorial_views(viewed_at);

-- Enable RLS
ALTER TABLE memorial_views ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can record views"
  ON memorial_views
  FOR INSERT
  TO public
  WITH CHECK (
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

CREATE POLICY "Memorial owners can view stats"
  ON memorial_views
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM memorials m
      WHERE m.id = memorial_id
      AND (
        m.owner_id = auth.uid()
        OR (
          m.org_id IS NOT NULL
          AND get_org_role(m.org_id, auth.uid()) IN ('OWNER', 'ADMIN')
        )
      )
    )
  );

-- Create function to hash IP addresses
CREATE OR REPLACE FUNCTION hash_ip(ip text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN encode(digest(ip, 'sha256'), 'hex');
END;
$$;

-- Add comments
COMMENT ON TABLE memorial_views IS 'Tracks views of memorial pages';
COMMENT ON COLUMN memorial_views.ip_hash IS 'Hashed IP address for anonymous view tracking';
COMMENT ON COLUMN memorial_views.user_agent IS 'Browser user agent string';