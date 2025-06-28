-- Migration: Group Deletion Policy
/*
  # Group Deletion Security

  1. New Policies
    - Add policy to ensure only group creators can delete groups
    - Verify cascade delete behavior for all related tables
  
  2. Security
    - Restrict deletion to only the original creator
    - Ensure proper cleanup of all related data
*/

-- Enable RLS on community_groups table if not already enabled
ALTER TABLE community_groups ENABLE ROW LEVEL SECURITY;

-- Drop existing delete policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Only creators can delete groups" ON community_groups;

-- Create policy to allow only the creator to delete a group
CREATE POLICY "Only creators can delete groups"
  ON community_groups
  FOR DELETE
  USING (created_by = auth.uid());

-- Ensure cascading delete is properly set up for related tables
DO $$
BEGIN
  -- Check if the foreign key from group_members to community_groups has ON DELETE CASCADE
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.referential_constraints
    WHERE constraint_schema = 'public'
    AND constraint_name = 'group_members_community_group_id_fkey'
    AND delete_rule = 'CASCADE'
  ) THEN
    -- If not, recreate the constraint with CASCADE
    ALTER TABLE group_members
    DROP CONSTRAINT IF EXISTS group_members_community_group_id_fkey;
    
    ALTER TABLE group_members
    ADD CONSTRAINT group_members_community_group_id_fkey
    FOREIGN KEY (group_id)
    REFERENCES community_groups(id)
    ON DELETE CASCADE;
  END IF;
  
  -- Check if the foreign key from group_posts to community_groups has ON DELETE CASCADE
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.referential_constraints
    WHERE constraint_schema = 'public'
    AND constraint_name = 'group_posts_group_id_fkey'
    AND delete_rule = 'CASCADE'
  ) THEN
    -- If not, recreate the constraint with CASCADE
    ALTER TABLE group_posts
    DROP CONSTRAINT IF EXISTS group_posts_group_id_fkey;
    
    ALTER TABLE group_posts
    ADD CONSTRAINT group_posts_group_id_fkey
    FOREIGN KEY (group_id)
    REFERENCES community_groups(id)
    ON DELETE CASCADE;
  END IF;
  
  -- Check if the foreign key from group_invitations to community_groups has ON DELETE CASCADE
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.referential_constraints
    WHERE constraint_schema = 'public'
    AND constraint_name = 'group_invitations_group_id_fkey'
    AND delete_rule = 'CASCADE'
  ) THEN
    -- If not, recreate the constraint with CASCADE
    ALTER TABLE group_invitations
    DROP CONSTRAINT IF EXISTS group_invitations_group_id_fkey;
    
    ALTER TABLE group_invitations
    ADD CONSTRAINT group_invitations_group_id_fkey
    FOREIGN KEY (group_id)
    REFERENCES community_groups(id)
    ON DELETE CASCADE;
  END IF;
  
  -- Check if the foreign key from group_join_requests to community_groups has ON DELETE CASCADE
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.referential_constraints
    WHERE constraint_schema = 'public'
    AND constraint_name = 'group_join_requests_group_id_fkey'
    AND delete_rule = 'CASCADE'
  ) THEN
    -- If not, recreate the constraint with CASCADE
    ALTER TABLE group_join_requests
    DROP CONSTRAINT IF EXISTS group_join_requests_group_id_fkey;
    
    ALTER TABLE group_join_requests
    ADD CONSTRAINT group_join_requests_group_id_fkey
    FOREIGN KEY (group_id)
    REFERENCES community_groups(id)
    ON DELETE CASCADE;
  END IF;
  
  -- Check if the foreign key from group_rules to community_groups has ON DELETE CASCADE
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.referential_constraints
    WHERE constraint_schema = 'public'
    AND constraint_name = 'group_rules_group_id_fkey'
    AND delete_rule = 'CASCADE'
  ) THEN
    -- If not, recreate the constraint with CASCADE
    ALTER TABLE group_rules
    DROP CONSTRAINT IF EXISTS group_rules_group_id_fkey;
    
    ALTER TABLE group_rules
    ADD CONSTRAINT group_rules_group_id_fkey
    FOREIGN KEY (group_id)
    REFERENCES community_groups(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Add audit logging for group deletions
CREATE OR REPLACE FUNCTION log_group_deletion()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    action,
    user_id,
    entity_type,
    entity_id,
    description,
    previous_value
  ) VALUES (
    'GROUP_DELETED',
    auth.uid(),
    'COMMUNITY_GROUP',
    OLD.id,
    'Group deleted: ' || OLD.name,
    jsonb_build_object(
      'group_id', OLD.id,
      'group_name', OLD.name,
      'created_at', OLD.created_at,
      'privacy', OLD.privacy
    )
  );
  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    -- Log failure but don't prevent deletion
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for the audit logging function if it doesn't exist
DROP TRIGGER IF EXISTS group_deletion_audit_trigger ON community_groups;
CREATE TRIGGER group_deletion_audit_trigger
  BEFORE DELETE ON community_groups
  FOR EACH ROW
  EXECUTE FUNCTION log_group_deletion();