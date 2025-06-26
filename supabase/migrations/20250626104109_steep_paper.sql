/*
  # Fix get_upcoming_events_with_rsvp RPC function

  1. Changes
    - Fix the column reference from e.cover_image_url to e.hero_media_url (which exists on events table)
    - Add memorial cover_image_url from memorials table if needed
    - Ensure proper column selection based on actual schema

  2. Notes
    - The events table has hero_media_url, not cover_image_url
    - Memorial cover_image_url is available via the memorials table join
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_upcoming_events_with_rsvp(uuid);

-- Recreate the function with correct column references
CREATE OR REPLACE FUNCTION get_upcoming_events_with_rsvp(user_id_param uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  start_time timestamptz,
  end_time timestamptz,
  location_text text,
  location_type event_location_type,
  visibility event_visibility_enum,
  status event_status_type,
  hero_media_url text,
  hero_media_type media_type_enum,
  creator_id uuid,
  memorial_id uuid,
  memorial_title text,
  memorial_cover_image_url text,
  user_rsvp rsvp_status,
  attendee_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.description,
    e.start_time,
    e.end_time,
    e.location_text,
    e.location_type,
    e.visibility,
    e.status,
    e.hero_media_url,
    e.hero_media_type,
    e.creator_id,
    e.memorial_id,
    m.title as memorial_title,
    m.cover_image_url as memorial_cover_image_url,
    COALESCE(ea.status, 'invited'::rsvp_status) as user_rsvp,
    COALESCE(attendee_counts.count, 0) as attendee_count
  FROM events e
  LEFT JOIN memorials m ON e.memorial_id = m.id
  LEFT JOIN event_attendees ea ON e.id = ea.event_id AND ea.user_id = user_id_param
  LEFT JOIN (
    SELECT 
      event_id, 
      COUNT(*) as count
    FROM event_attendees 
    WHERE status = 'accepted'
    GROUP BY event_id
  ) attendee_counts ON e.id = attendee_counts.event_id
  WHERE 
    e.start_time > NOW()
    AND e.status = 'published'
    AND (
      e.visibility = 'public'
      OR e.creator_id = user_id_param
      OR (e.memorial_id IS NOT NULL AND can_view_memorial(e.memorial_id))
      OR (
        e.visibility IN ('family_only', 'invitees_only') 
        AND EXISTS (
          SELECT 1 
          FROM event_attendees ea2 
          WHERE ea2.event_id = e.id 
          AND ea2.user_id = user_id_param 
          AND ea2.status = 'accepted'
        )
      )
    )
  ORDER BY e.start_time ASC
  LIMIT 10;
END;
$$;