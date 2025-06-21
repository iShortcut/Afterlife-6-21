-- Update the Memorial visibility access policy to include shared memorials
DROP POLICY IF EXISTS "Memorial visibility access" ON memorials;

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
  ) OR
  (
    -- Memorial is shared with user directly
    EXISTS (
      SELECT 1 FROM memorial_shares ms
      WHERE ms.memorial_id = memorials.id 
      AND ms.shared_with_user_id = auth.uid()
    )
  ) OR
  (
    -- Memorial is shared with user's email
    EXISTS (
      SELECT 1 FROM memorial_shares ms
      JOIN auth.users u ON u.email = ms.shared_with_email
      WHERE ms.memorial_id = memorials.id 
      AND u.id = auth.uid()
    )
  )
);

-- Update the Memorial edit access policy to use the can_edit_memorial function
DROP POLICY IF EXISTS "Memorial edit access" ON memorials;

CREATE POLICY "Memorial edit access" ON memorials
FOR UPDATE
USING (can_edit_memorial(id, auth.uid()));

-- Create a policy for delete access
DROP POLICY IF EXISTS "Memorial delete access" ON memorials;

CREATE POLICY "Memorial delete access" ON memorials
FOR DELETE
USING (owner_id = auth.uid());

-- Allow users to view shares where they are the recipient
CREATE POLICY "Users can view shares where they are the recipient"
  ON memorial_shares
  FOR SELECT
  TO authenticated
  USING (
    shared_with_user_id = auth.uid() OR
    shared_with_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );