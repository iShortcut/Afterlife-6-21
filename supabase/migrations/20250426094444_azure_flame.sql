-- Create videos table if it doesn't exist
CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid NOT NULL REFERENCES memorials(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  video_url text NOT NULL CHECK (video_url LIKE 'http%'),
  title text,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_timestamp' 
    AND tgrelid = 'videos'::regclass
  ) THEN
    CREATE TRIGGER set_timestamp
      BEFORE UPDATE ON videos
      FOR EACH ROW
      EXECUTE FUNCTION trigger_set_timestamp();
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read access for all" ON videos;
DROP POLICY IF EXISTS "Allow owner to manage videos" ON videos;

-- Create policies
CREATE POLICY "Allow read access for all"
  ON videos
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow owner to manage videos"
  ON videos
  FOR ALL
  TO public
  USING (
    memorial_id IN (
      SELECT id FROM memorials
      WHERE owner_id = auth.uid()
    )
  );