/*
  # Fix Group Invitation and Notification Permissions

  1. RLS Policy Updates
    - Add policy for group admins/moderators to view group invitations
    - Add policy for users to create group join request notifications
    - Add policy for group invitation management

  2. Security
    - Ensure only group admins/moderators can manage invitations
    - Allow users to send join request notifications to group admins
    - Maintain data security while enabling required functionality
*/

-- Drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "Allow group admins to view pending invitations" ON group_invitations;
DROP POLICY IF EXISTS "Allow users to create group join request notifications for admins" ON notifications;
DROP POLICY IF EXISTS "Group admins can view group invitations" ON group_invitations;
DROP POLICY IF EXISTS "Allow group invitation management" ON group_invitations;

-- Policy for group admins/moderators to view group invitations
CREATE POLICY "Group admins can view group invitations"
ON group_invitations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM group_members
    WHERE 
      group_members.group_id = group_invitations.group_id AND
      group_members.user_id = auth.uid() AND
      group_members.role IN ('ADMIN', 'MODERATOR') AND
      group_members.status = 'JOINED'
  )
);

-- Policy for users to create group join request notifications for admins
CREATE POLICY "Allow group join request notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  type = 'GROUP_JOIN_REQUEST' AND
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1
    FROM group_members
    WHERE
      group_members.group_id = (notifications.metadata->>'group_id')::uuid AND
      group_members.user_id = notifications.recipient_id AND
      group_members.role IN ('ADMIN', 'MODERATOR') AND
      group_members.status = 'JOINED'
  )
);

-- Policy for group invitation notifications
CREATE POLICY "Allow group invitation notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  type = 'GROUP_INVITATION' AND
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1
    FROM group_members
    WHERE
      group_members.group_id = (notifications.metadata->>'group_id')::uuid AND
      group_members.user_id = auth.uid() AND
      group_members.role IN ('ADMIN', 'MODERATOR') AND
      group_members.status = 'JOINED'
  )
);

-- Ensure group admins can manage all aspects of group invitations
CREATE POLICY "Allow group invitation management"
ON group_invitations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM group_members
    WHERE 
      group_members.group_id = group_invitations.group_id AND
      group_members.user_id = auth.uid() AND
      group_members.role IN ('ADMIN', 'MODERATOR') AND
      group_members.status = 'JOINED'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM group_members
    WHERE 
      group_members.group_id = group_invitations.group_id AND
      group_members.user_id = auth.uid() AND
      group_members.role IN ('ADMIN', 'MODERATOR') AND
      group_members.status = 'JOINED'
  )
);