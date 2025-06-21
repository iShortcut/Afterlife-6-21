/*
  # Add RLS policy for family relationships

  1. Changes
    - Add RLS policy for family_relationships table
    - Ensure relationships are only visible based on memorial visibility
    - Allow memorial owners full access

  2. Security
    - Maintain privacy of family relationship data
    - Respect memorial visibility settings
*/

-- Enable RLS on family_relationships if not already enabled
ALTER TABLE public.family_relationships ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read based on memorial visibility" ON public.family_relationships;
DROP POLICY IF EXISTS "Allow memorial owners to manage relationships" ON public.family_relationships;

-- Create read policy
CREATE POLICY "Allow read based on memorial visibility"
  ON public.family_relationships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memorials m
      WHERE m.id = family_relationships.memorial_id
      AND (
        m.visibility = 'public'
        OR m.owner_id = auth.uid()
        OR (
          m.visibility = 'friends_only'
          AND EXISTS (
            SELECT 1 FROM user_connections uc
            WHERE (
              (uc.user1_id = m.owner_id AND uc.user2_id = auth.uid())
              OR (uc.user2_id = m.owner_id AND uc.user1_id = auth.uid())
            )
            AND uc.status = 'ACCEPTED'
          )
        )
        OR (
          m.visibility = 'family_only'
          AND is_family_member(m.id, auth.uid())
        )
      )
    )
  );

-- Create management policy for memorial owners
CREATE POLICY "Allow memorial owners to manage relationships"
  ON public.family_relationships
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.memorials m
      WHERE m.id = family_relationships.memorial_id
      AND m.owner_id = auth.uid()
    )
  );

-- Add comment explaining the policies
COMMENT ON TABLE public.family_relationships IS 'Stores relationships between family members with appropriate access controls';