/*
  # Create get_news_feed function

  1. Function Purpose
    - Returns personalized posts for a user's news feed
    - Includes posts from friends and public posts
    - Orders by creation date (most recent first)

  2. Security
    - Uses SECURITY DEFINER to bypass RLS
    - Access controlled through GRANT to authenticated users only

  3. Return Values
    - id: Post ID
    - content: Post content
    - created_at: Post creation timestamp
    - visibility: Post visibility level
    - author_id: Post author's ID
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_news_feed(uuid);

-- Create the function
CREATE OR REPLACE FUNCTION public.get_news_feed(current_user_id uuid)
RETURNS TABLE (
  id uuid,
  content text,
  created_at timestamptz,
  visibility text,
  author_id uuid
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH friend_ids AS (
    -- Get all friend IDs (accepted connections)
    SELECT user2_id AS friend_id
    FROM user_connections
    WHERE user1_id = current_user_id AND status = 'ACCEPTED'
    UNION
    SELECT user1_id AS friend_id
    FROM user_connections
    WHERE user2_id = current_user_id AND status = 'ACCEPTED'
  )
  SELECT DISTINCT p.id, p.content, p.created_at, p.visibility, p.author_id
  FROM posts p
  WHERE
    -- Include posts from friends
    (p.author_id IN (SELECT friend_id FROM friend_ids) AND p.visibility IN ('public', 'friends_only'))
    -- Include public posts
    OR (p.visibility = 'public')
    -- Always include user's own posts
    OR p.author_id = current_user_id
  ORDER BY p.created_at DESC;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_news_feed(uuid) TO authenticated;

-- Add comment to the function
COMMENT ON FUNCTION public.get_news_feed(uuid) IS 'Returns personalized news feed posts for the specified user';