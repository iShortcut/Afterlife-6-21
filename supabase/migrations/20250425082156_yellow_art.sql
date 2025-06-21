/*
  # Add admin role check function

  1. Changes
    - Create is_admin function to check if a user has admin role
    - Update profiles table to add role column if it doesn't exist
    - Add default roles

  2. Security
    - Function uses SECURITY DEFINER to bypass RLS
    - Access controlled through GRANT to authenticated users only
*/

-- Add role column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles
    ADD COLUMN role text NOT NULL DEFAULT 'USER'
    CHECK (role IN ('USER', 'ADMIN', 'MODERATOR'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE profiles
    ADD COLUMN status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'SUSPENDED', 'BANNED'));
  END IF;
END $$;

-- Create or replace is_admin function
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = user_id;
  
  RETURN user_role = 'ADMIN';
END;
$$;

-- Create or replace check_user_role function
CREATE OR REPLACE FUNCTION check_user_role(user_id uuid, required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = user_id;
  
  RETURN user_role = required_role;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_role(uuid, text) TO authenticated;

-- Add comments
COMMENT ON FUNCTION is_admin(uuid) IS 'Checks if a user has the ADMIN role';
COMMENT ON FUNCTION check_user_role(uuid, text) IS 'Checks if a user has a specific role';