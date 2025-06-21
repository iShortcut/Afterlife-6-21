/*
  # Create tributes table

  1. New Tables
    - `tributes`
      - `id` (uuid, primary key)
      - `created_at` (timestamptz)
      - `memorial_id` (uuid, references memorials)
      - `author_id` (uuid, references profiles)
      - `parent_tribute_id` (uuid, references tributes)
      - `content` (text)
      - `type` (text)

  2. Security
    - Enable RLS
    - Add policies for:
      - Public read access for tributes on public memorials
      - Authenticated users can create tributes
      - Users can manage their own tributes

  3. Indexes
    - On memorial_id for memorial page queries
    - On author_id for author lookups
    - On parent_tribute_id for reply chains
*/

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.tributes CASCADE;

-- Create tributes table
CREATE TABLE public.tributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  memorial_id uuid NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  parent_tribute_id uuid REFERENCES public.tributes(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(trim(content)) > 0),
  type text NOT NULL DEFAULT 'comment' CHECK (
    type IN ('comment', 'tribute', 'memory', 'candle')
  )
);

-- Create indexes
CREATE INDEX idx_tributes_memorial_id ON public.tributes(memorial_id);
CREATE INDEX idx_tributes_author_id ON public.tributes(author_id);
CREATE INDEX idx_tributes_parent_tribute_id ON public.tributes(parent_tribute_id);

-- Enable RLS
ALTER TABLE public.tributes ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.tributes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Create policies
CREATE POLICY "Anyone can view tributes on public memorials"
  ON public.tributes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memorials
      WHERE memorials.id = tributes.memorial_id
      AND memorials.visibility = 'public'
    )
  );

CREATE POLICY "Authenticated users can create tributes"
  ON public.tributes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memorials
      WHERE memorials.id = tributes.memorial_id
      AND memorials.visibility = 'public'
    )
  );

CREATE POLICY "Users can update their own tributes"
  ON public.tributes
  FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY "Users can delete their own tributes"
  ON public.tributes
  FOR DELETE
  USING (author_id = auth.uid());

-- Add comment
COMMENT ON TABLE post_comments IS 'Comments on posts with optional threading support';