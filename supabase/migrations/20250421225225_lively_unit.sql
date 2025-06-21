/*
  # Add Memorial Support to Posts

  1. Changes
    - Add memorial_id column to posts table
    - Add foreign key constraint to memorials table
    - Update get_news_feed function to include memorial visibility

  2. Security
    - Maintains existing RLS policies
    - Updates get_news_feed function with SECURITY DEFINER
*/

-- Add memorial_id column to posts table
ALTER TABLE posts 
ADD COLUMN memorial_id uuid REFERENCES memorials(id) ON DELETE CASCADE;

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_news_feed(uuid);

-- Create updated function with memorial support
CREATE OR REPLACE FUNCTION public.get_news_feed(current_user_id uuid)
RETURNS TABLE (
  id uuid,
  content text,
  created_at timestamptz,
  visibility text,
  author_id uuid,
  memorial_id uuid
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
  SELECT DISTINCT p.id, p.content, p.created_at, p.visibility, p.author_id, p.memorial_id
  FROM posts p
  LEFT JOIN memorials m ON p.memorial_id = m.id
  WHERE
    -- Include posts from friends
    (p.author_id IN (SELECT friend_id FROM friend_ids) AND p.visibility IN ('public', 'friends_only'))
    -- Include public posts
    OR (p.visibility = 'public')
    -- Include posts from public memorials
    OR (m.id IS NOT NULL AND m.is_public = true)
    -- Always include user's own posts
    OR p.author_id = current_user_id
  ORDER BY p.created_at DESC;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_news_feed(uuid) TO authenticated;

-- Add comment to the function
COMMENT ON FUNCTION public.get_news_feed(uuid) IS 'Returns personalized news feed posts for the specified user, including memorial posts';