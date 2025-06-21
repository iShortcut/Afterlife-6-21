/*
  # Fix infinite recursion in memorial policies

  1. Changes
    - Drop all existing policies on memorials table
    - Create simple, non-recursive policies
    - Fix the can_edit_memorial function
    - Add proper RLS policies for different operations

  2. Security
    - Maintain the same access control rules
    - Avoid recursive policy definitions
    - Ensure proper sharing functionality
*/

-- Drop all existing policies on memorials table
DO $$
DECLARE
    policy_rec RECORD;
BEGIN
    FOR policy_rec IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'memorials' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.memorials;', policy_rec.policyname);
    END LOOP;
END $$;

-- Create simple, non-recursive policies for memorials

-- 1. Public memorials are visible to everyone
CREATE POLICY "Anyone can view public memorials"
  ON public.memorials
  FOR SELECT
  USING (visibility = 'public');

-- 2. Owners can view their own memorials
CREATE POLICY "Owners can view their own memorials"
  ON public.memorials
  FOR SELECT
  USING (owner_id = auth.uid());

-- 3. Users can view memorials shared with them
CREATE POLICY "Users can view memorials shared with them"
  ON public.memorials
  FOR SELECT
  USING (
    id IN (
      SELECT memorial_id FROM memorial_shares
      WHERE shared_with_user_id = auth.uid()
    )
  );

-- 4. Users can view memorials shared with their email
CREATE POLICY "Users can view memorials shared with their email"
  ON public.memorials
  FOR SELECT
  USING (
    id IN (
      SELECT ms.memorial_id 
      FROM memorial_shares ms
      JOIN auth.users u ON ms.shared_with_email = u.email
      WHERE u.id = auth.uid()
    )
  );

-- 5. Owners can create memorials
CREATE POLICY "Owners can create memorials"
  ON public.memorials
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- 6. Owners can update their own memorials
CREATE POLICY "Owners can update their own memorials"
  ON public.memorials
  FOR UPDATE
  USING (owner_id = auth.uid());

-- 7. Users with edit permission can update memorials
CREATE POLICY "Editors can update shared memorials"
  ON public.memorials
  FOR UPDATE
  USING (
    id IN (
      SELECT memorial_id FROM memorial_shares
      WHERE shared_with_user_id = auth.uid()
      AND permission_level = 'edit'
    )
  );

-- 8. Owners can delete their own memorials
CREATE POLICY "Owners can delete their own memorials"
  ON public.memorials
  FOR DELETE
  USING (owner_id = auth.uid());

-- Fix the can_edit_memorial function to avoid recursion
CREATE OR REPLACE FUNCTION can_edit_memorial(memorial_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_owner boolean;
  has_edit_permission boolean;
  user_email text;
BEGIN
  -- Check if user is the owner
  SELECT EXISTS (
    SELECT 1 FROM memorials m
    WHERE m.id = memorial_id AND m.owner_id = user_id
  ) INTO is_owner;
  
  IF is_owner THEN 
    RETURN true; 
  END IF;

  -- Check if user has edit permission through sharing
  SELECT u.email INTO user_email 
  FROM auth.users u 
  WHERE u.id = user_id;
  
  SELECT EXISTS (
    SELECT 1 FROM memorial_shares ms
    WHERE ms.memorial_id = memorial_id
    AND ms.permission_level = 'edit'
    AND (
      ms.shared_with_user_id = user_id 
      OR (ms.shared_with_email IS NOT NULL AND ms.shared_with_email = user_email)
    )
  ) INTO has_edit_permission;
  
  RETURN has_edit_permission;
END;
$$;