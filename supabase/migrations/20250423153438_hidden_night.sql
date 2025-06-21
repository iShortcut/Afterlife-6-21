/*
  # Update memorial access control

  1. Changes
    - Add stricter RLS policies for memorial management
    - Separate policies for different operations
    - Add helper function for checking edit permissions

  2. Security
    - Only owners can edit memorials
    - Organization admins can manage org-owned memorials
    - Maintain existing visibility rules
*/

-- Create function to check if user can edit memorial
CREATE OR REPLACE FUNCTION can_edit_memorial(memorial_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM memorials m
    WHERE m.id = memorial_id
    AND (
      -- User is the owner
      m.owner_id = user_id
      OR
      -- User is org admin and memorial belongs to org
      (
        m.org_id IS NOT NULL
        AND get_org_role(m.org_id, user_id) IN ('OWNER', 'ADMIN')
      )
    )
  );
END;
$$;

-- Drop existing management policies
DROP POLICY IF EXISTS "Memorial management access" ON memorials;
DROP POLICY IF EXISTS "Owners and org members have full access" ON memorials;

-- Create separate policies for different operations
CREATE POLICY "Memorial edit access"
  ON memorials
  FOR UPDATE
  USING (can_edit_memorial(id, auth.uid()));

CREATE POLICY "Memorial delete access"
  ON memorials
  FOR DELETE
  USING (can_edit_memorial(id, auth.uid()));

-- Add comment explaining edit permissions
COMMENT ON FUNCTION can_edit_memorial(uuid, uuid) IS 'Checks if a user has permission to edit a memorial';