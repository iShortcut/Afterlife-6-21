/*
  # Add family_only visibility option

  1. Changes
    - Update visibility CHECK constraint to include 'family_only'
    - Update RLS policies to handle family-only access
    - Add helper function for checking family relationships

  2. Security
    - Maintain existing RLS policies
    - Add family relationship checks
*/

-- Update visibility CHECK constraint
ALTER TABLE memorials
DROP CONSTRAINT IF EXISTS memorials_visibility_check;

ALTER TABLE memorials
ADD CONSTRAINT memorials_visibility_check
CHECK (visibility IN ('public', 'private', 'friends_only', 'family_only'));

-- Create function to check if user is family member
CREATE OR REPLACE FUNCTION is_family_member(memorial_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is directly related to the memorial through family_members table
  RETURN EXISTS (
    SELECT 1 FROM family_members fm
    WHERE fm.memorial_id = $1
    AND (
      -- User is directly added as a family member
      (fm.profile_id = $2) OR
      -- User added the family member
      (fm.added_by_id = $2) OR
      -- User is related through family relationships
      EXISTS (
        SELECT 1 FROM family_relationships fr
        JOIN family_members fm2 ON (
          fr.member1_id = fm2.id OR 
          fr.member2_id = fm2.id
        )
        WHERE fr.memorial_id = $1
        AND fm2.profile_id = $2
      )
    )
  );
END;
$$;

-- Update memorial visibility policies
DROP POLICY IF EXISTS "Anyone can view public memorials" ON memorials;
DROP POLICY IF EXISTS "Owners and org members have full access" ON memorials;

CREATE POLICY "Memorial visibility access"
  ON memorials
  FOR SELECT
  USING (
    -- Public memorials
    (visibility = 'public' AND (
      tier = 'free' OR
      tier = get_user_tier(auth.uid()) OR
      (org_id IS NOT NULL AND is_org_member(org_id, auth.uid()))
    ))
    OR
    -- Private memorials
    (visibility = 'private' AND owner_id = auth.uid())
    OR
    -- Friends-only memorials
    (visibility = 'friends_only' AND EXISTS (
      SELECT 1 FROM user_connections uc
      WHERE (
        (uc.user1_id = owner_id AND uc.user2_id = auth.uid()) OR
        (uc.user2_id = owner_id AND uc.user1_id = auth.uid())
      )
      AND uc.status = 'ACCEPTED'
    ))
    OR
    -- Family-only memorials
    (visibility = 'family_only' AND is_family_member(id, auth.uid()))
  );

CREATE POLICY "Memorial management access"
  ON memorials
  FOR ALL
  USING (
    owner_id = auth.uid() OR
    (org_id IS NOT NULL AND is_org_member(org_id, auth.uid()))
  );

-- Add comment explaining visibility options
COMMENT ON COLUMN memorials.visibility IS 'Memorial visibility: public, private, friends_only, or family_only';