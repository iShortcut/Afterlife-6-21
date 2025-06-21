/*
  # Update schema to match CSV specifications

  1. New Tables
    - `family_members`
      - Store family member information
      - Link to memorials and profiles
    - `family_relationships`
      - Track relationships between family members
      - Support different relationship types

  2. Changes
    - Add visibility column to memorials
    - Update tributes table with new columns
    - Add relationship_type enum

  3. Security
    - Enable RLS on new tables
    - Add appropriate policies
*/

-- Create relationship_type enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'relationship_type') THEN
    CREATE TYPE relationship_type AS ENUM ('PARENT_CHILD', 'SPOUSE', 'SIBLING');
  END IF;
END $$;

-- Add visibility column to memorials if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'memorials' AND column_name = 'visibility'
  ) THEN
    ALTER TABLE memorials 
    ADD COLUMN visibility text DEFAULT 'public'::text
    CHECK (visibility IN ('public', 'private', 'friends_only'));
  END IF;
END $$;

-- Create family_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  memorial_id uuid NOT NULL REFERENCES memorials(id) ON DELETE CASCADE,
  added_by_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  first_name text NOT NULL CHECK (char_length(first_name) > 0),
  last_name text,
  birth_date date,
  death_date date,
  bio text,
  avatar_url text
);

-- Create family_relationships table if it doesn't exist
CREATE TABLE IF NOT EXISTS family_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  memorial_id uuid NOT NULL REFERENCES memorials(id) ON DELETE CASCADE,
  member1_id uuid NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  member2_id uuid NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  relationship_type relationship_type NOT NULL,
  start_date date,
  end_date date,
  CONSTRAINT check_different_members_rel CHECK (member1_id <> member2_id),
  CONSTRAINT unique_relationship_pair UNIQUE (member1_id, member2_id, relationship_type)
);

-- Enable RLS
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_relationships ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Owner or adder can manage family members" ON family_members;
DROP POLICY IF EXISTS "Read access based on memorial visibility" ON family_members;

-- Create policies for family_members
CREATE POLICY "Owner or adder can manage family members"
  ON family_members
  FOR ALL
  TO public
  USING (
    added_by_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM memorials m
      WHERE m.id = family_members.memorial_id
      AND m.owner_id = auth.uid()
    )
  );

CREATE POLICY "Read access based on memorial visibility"
  ON family_members
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM memorials m
      WHERE m.id = family_members.memorial_id
      AND (m.visibility = 'public' OR m.owner_id = auth.uid())
    )
  );

-- Create updated_at trigger for family_members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at'
    AND tgrelid = 'family_members'::regclass
  ) THEN
    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON family_members
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS family_members_memorial_id_idx ON family_members(memorial_id);
CREATE INDEX IF NOT EXISTS family_relationships_memorial_id_idx ON family_relationships(memorial_id);
CREATE INDEX IF NOT EXISTS unique_relationship_pair ON family_relationships(member1_id, member2_id, relationship_type);