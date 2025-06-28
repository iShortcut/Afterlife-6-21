/*
  # Add group invitations and join requests functionality
  
  1. New Tables
    - `group_invitations`
      - For storing invitations to join groups
    - `group_join_requests`
      - For storing requests to join groups
  
  2. Security
    - Enable RLS on both tables
    - Add appropriate policies for access control
*/

-- Create group_invitations table
CREATE TABLE IF NOT EXISTS group_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  email text,
  invited_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  message text,
  created_at timestamptz DEFAULT now() NOT NULL,
  responded_at timestamptz,
  CONSTRAINT user_or_email_required CHECK (
    (user_id IS NOT NULL) OR (email IS NOT NULL)
  ),
  CONSTRAINT unique_user_invitation UNIQUE (group_id, user_id) NULLS NOT DISTINCT,
  CONSTRAINT unique_email_invitation UNIQUE (group_id, email) NULLS NOT DISTINCT
);

-- Create group_join_requests table
CREATE TABLE IF NOT EXISTS group_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at timestamptz DEFAULT now() NOT NULL,
  responded_at timestamptz,
  rejection_reason text,
  CONSTRAINT unique_join_request UNIQUE (group_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_group_invitations_group_id ON group_invitations(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_user_id ON group_invitations(user_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_email ON group_invitations(email);
CREATE INDEX IF NOT EXISTS idx_group_invitations_status ON group_invitations(status);

CREATE INDEX IF NOT EXISTS idx_group_join_requests_group_id ON group_join_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_group_join_requests_user_id ON group_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_group_join_requests_status ON group_join_requests(status);

-- Enable RLS
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_join_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for group_invitations
CREATE POLICY "Group admins can manage invitations"
  ON group_invitations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = group_invitations.group_id
      AND user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can view their own invitations"
  ON group_invitations
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = group_invitations.email
    )
  );

CREATE POLICY "Users can accept/decline their own invitations"
  ON group_invitations
  FOR UPDATE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = group_invitations.email
    )
  )
  WITH CHECK (
    (user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = group_invitations.email
    )) AND
    status IN ('accepted', 'declined')
  );

-- Create policies for group_join_requests
CREATE POLICY "Group admins can manage join requests"
  ON group_join_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = group_join_requests.group_id
      AND user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can create join requests"
  ON group_join_requests
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    status = 'pending' AND
    NOT EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = group_join_requests.group_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own join requests"
  ON group_join_requests
  FOR SELECT
  USING (
    user_id = auth.uid()
  );

CREATE POLICY "Users can withdraw their own pending join requests"
  ON group_join_requests
  FOR DELETE
  USING (
    user_id = auth.uid() AND
    status = 'pending'
  );

-- Add comment
COMMENT ON TABLE group_invitations IS 'Stores invitations to join community groups';
COMMENT ON TABLE group_join_requests IS 'Stores requests to join community groups';