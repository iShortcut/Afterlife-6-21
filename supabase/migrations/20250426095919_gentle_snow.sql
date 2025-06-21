/*
  # Fix memorial policies recursion

  1. Changes
    - Replace recursive memorial visibility policy with a simplified version
    - Add proper checks for visibility without causing infinite loops
    - Maintain all existing access control requirements

  2. Security
    - Maintains RLS protection
    - Preserves existing visibility rules
    - Fixes infinite recursion issue
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Memorial visibility access" ON memorials;

-- Create new, non-recursive policy for memorial visibility
CREATE POLICY "Memorial visibility access" ON memorials
FOR SELECT TO public
USING (
  (visibility = 'public'::text) OR 
  (owner_id = auth.uid()) OR
  (
    visibility = 'friends_only' AND 
    EXISTS (
      SELECT 1 FROM user_connections uc
      WHERE (
        (uc.user1_id = memorials.owner_id AND uc.user2_id = auth.uid()) OR
        (uc.user2_id = memorials.owner_id AND uc.user1_id = auth.uid())
      )
      AND uc.status = 'ACCEPTED'
    )
  ) OR
  (
    visibility = 'family_only' AND
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.memorial_id = memorials.id
      AND fm.profile_id = auth.uid()
    )
  ) OR
  (
    org_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = memorials.org_id
      AND om.user_id = auth.uid()
    )
  )
);