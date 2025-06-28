/*
  # Fix Group Invitations RLS Policies

  1. Security Updates
    - Add missing RLS policy for group admins to view invitations
    - Ensure group admins can manage invitations for their groups
    - Fix permission issues with group invitation management

  2. Changes
    - Add policy for group admins to view all invitations for their group
    - Update existing policies to ensure proper access control
*/

-- Drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "Group admins can manage invitations" ON public.group_invitations;
DROP POLICY IF EXISTS "Users can accept/decline their own invitations" ON public.group_invitations;
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.group_invitations;

-- Create comprehensive RLS policies for group_invitations

-- Allow group admins and moderators to view all invitations for their groups
CREATE POLICY "Group admins can view group invitations"
  ON public.group_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members 
      WHERE group_members.group_id = group_invitations.group_id 
        AND group_members.user_id = auth.uid() 
        AND group_members.role IN ('ADMIN', 'MODERATOR')
        AND group_members.status = 'JOINED'
    )
  );

-- Allow group admins and moderators to insert invitations
CREATE POLICY "Group admins can create invitations"
  ON public.group_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members 
      WHERE group_members.group_id = group_invitations.group_id 
        AND group_members.user_id = auth.uid() 
        AND group_members.role IN ('ADMIN', 'MODERATOR')
        AND group_members.status = 'JOINED'
    )
    AND invited_by = auth.uid()
  );

-- Allow group admins and moderators to update invitations (e.g., cancel them)
CREATE POLICY "Group admins can update invitations"
  ON public.group_invitations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members 
      WHERE group_members.group_id = group_invitations.group_id 
        AND group_members.user_id = auth.uid() 
        AND group_members.role IN ('ADMIN', 'MODERATOR')
        AND group_members.status = 'JOINED'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members 
      WHERE group_members.group_id = group_invitations.group_id 
        AND group_members.user_id = auth.uid() 
        AND group_members.role IN ('ADMIN', 'MODERATOR')
        AND group_members.status = 'JOINED'
    )
  );

-- Allow group admins and moderators to delete invitations
CREATE POLICY "Group admins can delete invitations"
  ON public.group_invitations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members 
      WHERE group_members.group_id = group_invitations.group_id 
        AND group_members.user_id = auth.uid() 
        AND group_members.role IN ('ADMIN', 'MODERATOR')
        AND group_members.status = 'JOINED'
    )
  );

-- Allow users to view invitations sent to them (by user_id)
CREATE POLICY "Users can view their own user invitations"
  ON public.group_invitations
  FOR SELECT
  USING (user_id = auth.uid());

-- Allow users to view invitations sent to their email
CREATE POLICY "Users can view their own email invitations"
  ON public.group_invitations
  FOR SELECT
  USING (
    email IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
        AND auth.users.email = group_invitations.email
    )
  );

-- Allow users to update their own invitations (accept/decline)
CREATE POLICY "Users can respond to their user invitations"
  ON public.group_invitations
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid() 
    AND status IN ('accepted', 'declined')
  );

-- Allow users to update invitations sent to their email
CREATE POLICY "Users can respond to their email invitations"
  ON public.group_invitations
  FOR UPDATE
  USING (
    email IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
        AND auth.users.email = group_invitations.email
    )
  )
  WITH CHECK (
    email IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
        AND auth.users.email = group_invitations.email
    )
    AND status IN ('accepted', 'declined')
  );

-- Ensure RLS is enabled
ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;