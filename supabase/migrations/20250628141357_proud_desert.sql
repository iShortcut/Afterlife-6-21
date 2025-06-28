-- Create a table for group rules if it doesn't exist
CREATE TABLE IF NOT EXISTS group_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
  rules_text text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create index for the group_rules table
CREATE INDEX IF NOT EXISTS idx_group_rules_group_id ON group_rules(group_id);

-- Enable RLS on the table
ALTER TABLE group_rules ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger for group_rules
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_updated_at' 
    AND tgrelid = 'group_rules'::regclass
  ) THEN
    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON group_rules
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- Create policies for group_rules
DO $$
BEGIN
  -- Check if "Anyone can view rules for public groups" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'group_rules' 
    AND policyname = 'Anyone can view rules for public groups'
  ) THEN
    CREATE POLICY "Anyone can view rules for public groups"
      ON group_rules
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM community_groups
          WHERE id = group_id
          AND privacy = 'public'
        )
      );
  END IF;

  -- Check if "Group members can view rules" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'group_rules' 
    AND policyname = 'Group members can view rules'
  ) THEN
    CREATE POLICY "Group members can view rules"
      ON group_rules
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM group_members
          WHERE group_id = group_rules.group_id
          AND user_id = auth.uid()
        )
      );
  END IF;

  -- Check if "Group admins can manage rules" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'group_rules' 
    AND policyname = 'Group admins can manage rules'
  ) THEN
    CREATE POLICY "Group admins can manage rules"
      ON group_rules
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM group_members
          WHERE group_id = group_rules.group_id
          AND user_id = auth.uid()
          AND role = 'ADMIN'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM group_members
          WHERE group_id = group_rules.group_id
          AND user_id = auth.uid()
          AND role = 'ADMIN'
        )
      );
  END IF;
END $$;

-- Add comment
COMMENT ON TABLE group_rules IS 'Stores rules and guidelines for community groups';