/*
  # Standardize owner_id in memorials table

  1. Changes
    - Rename user_id to owner_id in memorials table
    - Update all policies to use owner_id consistently

  2. Security
    - Recreate policies with owner_id
*/

-- Check if user_id column exists and rename it to owner_id if it does
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memorials' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE memorials RENAME COLUMN user_id TO owner_id;
  END IF;
END $$;

-- Drop existing policies that might reference user_id
DROP POLICY IF EXISTS "Anyone can view public memorials" ON memorials;
DROP POLICY IF EXISTS "Owners have full access to their memorials" ON memorials;
DROP POLICY IF EXISTS "Public read access for visible memorials" ON memorials;
DROP POLICY IF EXISTS "Users can create memorials" ON memorials;
DROP POLICY IF EXISTS "Users can delete their own memorials" ON memorials;
DROP POLICY IF EXISTS "Users can update their own memorials" ON memorials;
DROP POLICY IF EXISTS "Users can view their own memorials regardless of visibility" ON memorials;

-- Recreate policies with owner_id
CREATE POLICY "Anyone can view public memorials"
  ON memorials
  FOR SELECT
  TO public
  USING (is_public = true);

CREATE POLICY "Owners have full access to their memorials"
  ON memorials
  FOR ALL
  TO public
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create memorials"
  ON memorials
  FOR INSERT
  TO public
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can view their own memorials"
  ON memorials
  FOR SELECT
  TO public
  USING (owner_id = auth.uid());