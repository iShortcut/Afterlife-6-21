/*
  # Update RLS policies for memorials and tributes

  1. Changes
    - Drop existing policies to avoid conflicts
    - Recreate policies with updated conditions
    - Ensure consistent naming and security rules

  2. Security
    - Maintain same security model
    - Public read access for public memorials
    - Owner-only access for private memorials
    - Authenticated user access for tributes
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Public read access for visible memorials" ON public.memorials;
DROP POLICY IF EXISTS "Owners have full access to their memorials" ON public.memorials;
DROP POLICY IF EXISTS "Public read access for tributes on public memorials" ON public.tributes;
DROP POLICY IF EXISTS "Authenticated users can post tributes on public memorials" ON public.tributes;
DROP POLICY IF EXISTS "Users can update their own tributes" ON public.tributes;
DROP POLICY IF EXISTS "Users can delete their own tributes" ON public.tributes;

-- Enable RLS on memorials table
ALTER TABLE public.memorials ENABLE ROW LEVEL SECURITY;

-- Memorial policies
CREATE POLICY "Public read access for visible memorials"
  ON public.memorials
  FOR SELECT
  USING (is_public = true);

CREATE POLICY "Owners have full access to their memorials"
  ON public.memorials
  FOR ALL
  USING (auth.uid() = user_id);

-- Enable RLS on tributes table
ALTER TABLE public.tributes ENABLE ROW LEVEL SECURITY;

-- Tribute policies
CREATE POLICY "Public read access for tributes on public memorials"
  ON public.tributes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memorials m 
      WHERE m.id = memorial_id 
      AND m.is_public = true
    )
  );

CREATE POLICY "Authenticated users can post tributes on public memorials"
  ON public.tributes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memorials m 
      WHERE m.id = memorial_id 
      AND m.is_public = true
    )
  );

CREATE POLICY "Users can update their own tributes"
  ON public.tributes
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tributes"
  ON public.tributes
  FOR DELETE
  USING (auth.uid() = user_id);