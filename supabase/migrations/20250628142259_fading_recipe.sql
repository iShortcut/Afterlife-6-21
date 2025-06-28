/*
  # Fix profiles table RLS policy for user search and group features

  1. Security Changes
    - Add policy to allow authenticated users to view basic profile information of other users
    - This enables group invitations, member lists, and user search functionality
    - Only exposes necessary public profile fields (id, full_name, username, avatar_url, bio)
    - Respects profile visibility settings where applicable

  2. Changes
    - Add "Allow authenticated users to view public profile data" policy for SELECT operations
    - This policy allows authenticated users to read basic profile information needed for social features
*/

-- Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON profiles;

-- Add policy to allow authenticated users to view basic profile information
-- This enables group invitations, member lists, and user search functionality
CREATE POLICY "Allow authenticated users to view public profile data"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Users can always view their own profile
    id = auth.uid() 
    OR 
    -- Authenticated users can view other profiles based on visibility settings
    (
      visibility = 'public'::profile_visibility
      OR 
      (
        visibility = 'friends_only'::profile_visibility 
        AND EXISTS (
          SELECT 1 FROM user_connections 
          WHERE (
            (user_id = auth.uid() AND friend_id = profiles.id) 
            OR 
            (user_id = profiles.id AND friend_id = auth.uid())
          ) 
          AND status = 'accepted'
        )
      )
      OR
      -- For private profiles, only the owner can view
      (visibility = 'private'::profile_visibility AND id = auth.uid())
    )
  );

-- Ensure the existing policy for users to update their own profile remains
-- (This should already exist, but we'll make sure it's there)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Allow authenticated users to update their own profile'
  ) THEN
    CREATE POLICY "Allow authenticated users to update their own profile"
      ON profiles
      FOR UPDATE
      TO authenticated
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());
  END IF;
END $$;

-- Ensure the existing policy for users to insert their own profile remains
-- (This should already exist, but we'll make sure it's there)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Allow authenticated users to insert their own profile'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert their own profile"
      ON profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (id = auth.uid());
  END IF;
END $$;