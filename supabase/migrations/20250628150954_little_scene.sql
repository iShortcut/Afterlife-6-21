/*
  # Group Deletion Policy

  1. Security
    - Ensure only group creators can delete their groups
    - Protect against unauthorized deletion attempts
  
  2. Changes
    - Add RLS policy for group deletion
    - Ensure cascading deletion works properly for related tables
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