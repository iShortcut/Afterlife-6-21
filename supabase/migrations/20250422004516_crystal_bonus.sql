/*
  # Standardize owner_id in memorials table

  1. Changes
    - Rename user_id to owner_id if it exists
    - Update foreign key constraints
    - Update RLS policies
    - Update indexes

  2. Security
    - Recreate RLS policies with owner_id
    - Maintain existing security model
*/

-- Check if user_id column exists and rename it to owner_id if it does
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'memorials'
    AND column_name = 'user_id'
  ) THEN
    -- Rename the column
    ALTER TABLE memorials RENAME COLUMN user_id TO owner_id;

    -- Drop existing foreign key constraint on user_id if it exists
    ALTER TABLE memorials
    DROP CONSTRAINT IF EXISTS memorials_user_id_fkey;

    -- Drop potentially existing incorrect foreign key constraint on owner_id if it exists
    ALTER TABLE memorials
    DROP CONSTRAINT IF EXISTS memorials_owner_id_fkey;

    -- Add the corrected foreign key constraint pointing to public.profiles
    ALTER TABLE memorials
    ADD CONSTRAINT memorials_owner_id_fkey
    FOREIGN KEY (owner_id)
    REFERENCES public.profiles(id) -- <--- השורה שתוקנה: מפנה ל public.profiles
    ON DELETE CASCADE;

    -- Rename index if it exists
    ALTER INDEX IF EXISTS memorials_user_id_idx
    RENAME TO memorials_owner_id_idx;
  END IF;
END $$;

-- Drop existing policies that might reference old names or structures
-- Note: It's good practice to drop policies by name if they exist to avoid errors
DROP POLICY IF EXISTS "Anyone can view public memorials" ON memorials;
DROP POLICY IF EXISTS "Owners have full access to their memorials" ON memorials;
DROP POLICY IF EXISTS "Public read access for visible memorials" ON memorials;
DROP POLICY IF EXISTS "Users can create memorials" ON memorials;
DROP POLICY IF EXISTS "Users can delete their own memorials" ON memorials;
DROP POLICY IF EXISTS "Users can update their own memorials" ON memorials;
DROP POLICY IF EXISTS "Users can view their own memorials regardless of visibility" ON memorials;

-- Create new policies using owner_id consistently
-- Note: These policies might need further refinement based on your application's specific access rules
-- For example, visibility check might need to reference the 'visibility' column added in a later migration
CREATE POLICY "Anyone can view public memorials"
  ON memorials
  FOR SELECT
  TO public
  USING (visibility = 'public'); -- Assuming 'visibility' column exists and is handled correctly in RLS

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

-- Note: Update/Delete policies are likely handled in other migrations (e.g., 20250423153438_hidden_night.sql)
-- If you need update/delete policies defined here, add them based on owner_id = auth.uid()

-- Create index for owner_id if it doesn't exist
CREATE INDEX IF NOT EXISTS memorials_owner_id_idx ON memorials(owner_id);

-- Create or replace the get_news_feed function
-- Note: This function definition might be updated in later migrations as well.
-- Ensure this definition is the one you intend to use.
CREATE OR REPLACE FUNCTION public.get_news_feed(current_user_id uuid)
RETURNS TABLE (
  id uuid,
  content text,
  created_at timestamptz,
  visibility text,
  author_id uuid,
  memorial_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  WITH friend_ids AS (
    -- Get all friend IDs (accepted connections)
    SELECT user2_id AS friend_id
    FROM user_connections
    WHERE user1_id = current_user_id AND status = 'ACCEPTED'
    UNION
    SELECT user1_id AS friend_id
    FROM user_connections
    WHERE user2_id = current_user_id AND status = 'ACCEPTED'
  )
  SELECT DISTINCT p.id, p.content, p.created_at, p.visibility, p.author_id, p.memorial_id
  FROM posts p
  LEFT JOIN memorials m ON p.memorial_id = m.id
  LEFT JOIN user_connections uc1 ON (uc1.user1_id = current_user_id AND uc1.user2_id = p.author_id AND uc1.status = 'ACCEPTED')
  LEFT JOIN user_connections uc2 ON (uc2.user2_id = current_user_id AND uc2.user1_id = p.author_id AND uc2.status = 'ACCEPTED')
  WHERE
    -- Include posts from friends
    (p.author_id = ANY(
      SELECT friend_id FROM friend_ids
    ) AND p.visibility IN ('public', 'friends_only'))
    -- Include public posts
    OR (p.visibility = 'public')
    -- Include posts from public memorials (using 'visibility' column)
    OR (m.id IS NOT NULL AND m.visibility = 'public')
    -- Always include user's own posts
    OR p.author_id = current_user_id
    -- Always include posts on memorials owned by the user
    OR m.owner_id = current_user_id
  ORDER BY p.created_at DESC
$function$;
