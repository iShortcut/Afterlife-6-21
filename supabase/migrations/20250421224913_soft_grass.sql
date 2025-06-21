/*
  # Create get_friends function

  1. Function Purpose
    - Returns all accepted friends for a given user ID
    - Handles bidirectional friendships (user can be either user1 or user2)
    - Returns friend's profile information

  2. Security
    - Uses SECURITY DEFINER to bypass RLS
    - Access controlled through GRANT to authenticated users only

  3. Return Values
    - id: Friend's user ID
    - full_name: Friend's full name
    - avatar_url: Friend's avatar URL
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_friends(uuid);

-- Create the function
CREATE OR REPLACE FUNCTION public.get_friends(current_user_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Get friends where current user is user1
  SELECT 
    p.id,
    p.full_name,
    p.avatar_url
  FROM user_connections uc
  JOIN profiles p ON p.id = uc.user2_id
  WHERE uc.user1_id = current_user_id 
  AND uc.status = 'ACCEPTED'
  
  UNION
  
  -- Get friends where current user is user2
  SELECT 
    p.id,
    p.full_name,
    p.avatar_url
  FROM user_connections uc
  JOIN profiles p ON p.id = uc.user1_id
  WHERE uc.user2_id = current_user_id 
  AND uc.status = 'ACCEPTED';
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_friends(uuid) TO authenticated;

-- Add comment to the function
COMMENT ON FUNCTION public.get_friends(uuid) IS 'Returns all accepted friends for the specified user';