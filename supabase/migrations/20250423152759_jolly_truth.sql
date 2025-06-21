/*
  # Add organization support to memorials

  1. New Tables
    - `organizations`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `created_at` (timestamptz)
      - `created_by` (uuid, references auth.users)

    - `organization_members`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, references organizations)
      - `user_id` (uuid, references auth.users)
      - `role` (text: OWNER, ADMIN, MEMBER)
      - `created_at` (timestamptz)

  2. Changes
    - Add org_id column to memorials table
    - Add RLS policies for organization-based access
*/

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT name_not_empty CHECK (char_length(trim(name)) > 0)
);

-- Create organization_members table
CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Add org_id to memorials
ALTER TABLE memorials
ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_memorials_org_id ON memorials(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is org member
CREATE OR REPLACE FUNCTION is_org_member(org_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
    AND user_id = user_id
  );
END;
$$;

-- Create function to get user's org role
CREATE OR REPLACE FUNCTION get_org_role(org_id uuid, user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM organization_members
  WHERE organization_id = org_id
  AND user_id = user_id;
  
  RETURN user_role;
END;
$$;

-- Organizations policies
CREATE POLICY "Anyone can view organizations"
  ON organizations
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create organizations"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Organization owners and admins can update"
  ON organizations
  FOR UPDATE
  USING (
    get_org_role(id, auth.uid()) IN ('OWNER', 'ADMIN')
  );

CREATE POLICY "Only owners can delete organizations"
  ON organizations
  FOR DELETE
  USING (
    get_org_role(id, auth.uid()) = 'OWNER'
  );

-- Organization members policies
CREATE POLICY "Members can view organization members"
  ON organization_members
  FOR SELECT
  USING (
    is_org_member(organization_id, auth.uid())
  );

CREATE POLICY "Owners and admins can manage members"
  ON organization_members
  FOR ALL
  USING (
    get_org_role(organization_id, auth.uid()) IN ('OWNER', 'ADMIN')
  );

-- Update memorial policies for org support
DROP POLICY IF EXISTS "Anyone can view public memorials" ON memorials;
DROP POLICY IF EXISTS "Owners have full access to their memorials" ON memorials;

CREATE POLICY "Anyone can view public memorials"
  ON memorials
  FOR SELECT
  USING (
    visibility = 'public' AND (
      tier = 'free' OR
      tier = get_user_tier(auth.uid()) OR
      (org_id IS NOT NULL AND is_org_member(org_id, auth.uid()))
    )
  );

CREATE POLICY "Owners and org members have full access"
  ON memorials
  FOR ALL
  USING (
    owner_id = auth.uid() OR
    (org_id IS NOT NULL AND is_org_member(org_id, auth.uid()))
  );

-- Add comments
COMMENT ON TABLE organizations IS 'Organizations that can own and manage memorials';
COMMENT ON TABLE organization_members IS 'Members of organizations and their roles';
COMMENT ON COLUMN memorials.org_id IS 'Optional organization that owns this memorial';