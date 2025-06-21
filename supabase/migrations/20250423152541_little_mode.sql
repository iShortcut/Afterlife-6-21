/*
  # Add tier support to memorials

  1. Changes
    - Add tier column to memorials table
    - Add check constraint for valid tiers
    - Update RLS policies to check subscription status
    - Add function to check user subscription tier

  2. Security
    - Maintain existing RLS
    - Add tier-based access control
*/

-- Add tier column to memorials if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'memorials' AND column_name = 'tier'
  ) THEN
    ALTER TABLE memorials
    ADD COLUMN tier text NOT NULL DEFAULT 'free'
    CHECK (tier IN ('free', 'basic', 'premium'));
  END IF;
END $$;

-- Create function to check user subscription tier
CREATE OR REPLACE FUNCTION public.get_user_tier(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_tier text;
BEGIN
  -- Get the user's active subscription tier
  SELECT 
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM subscriptions s
        JOIN products p ON s.product_id = p.id
        WHERE s.user_id = $1
        AND s.status = 'ACTIVE'
        AND p.metadata->>'tier' = 'premium'
      ) THEN 'premium'
      WHEN EXISTS (
        SELECT 1 FROM subscriptions s
        JOIN products p ON s.product_id = p.id
        WHERE s.user_id = $1
        AND s.status = 'ACTIVE'
        AND p.metadata->>'tier' = 'basic'
      ) THEN 'basic'
      ELSE 'free'
    END INTO user_tier;
    
  RETURN user_tier;
END;
$$;

-- Update RLS policies for tier-based access
DROP POLICY IF EXISTS "Anyone can view public memorials" ON memorials;
DROP POLICY IF EXISTS "Owners have full access to their memorials" ON memorials;

-- Public read access based on tier
CREATE POLICY "Anyone can view public memorials"
  ON memorials
  FOR SELECT
  TO public
  USING (
    visibility = 'public' AND (
      tier = 'free' OR
      tier = get_user_tier(auth.uid())
    )
  );

-- Owner access based on tier
CREATE POLICY "Owners have full access to their memorials"
  ON memorials
  FOR ALL
  TO public
  USING (
    owner_id = auth.uid() AND
    tier = get_user_tier(auth.uid())
  );

-- Add comment explaining tier system
COMMENT ON COLUMN memorials.tier IS 'Memorial tier level (free, basic, premium) - must match user subscription';