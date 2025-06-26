/*
# Update RSVP Function

1. New Functions
  - `update-rsvp-status` - A secure RPC function to update a user's RSVP status for an event

2. Changes
  - Fixes the ambiguous column reference in the get_upcoming_events_with_rsvp function
  - Ensures proper type handling for event status and visibility
*/

-- Create or replace the update-rsvp-status function
CREATE OR REPLACE FUNCTION update_rsvp_status(
  event_id_input uuid,
  new_status rsvp_status
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_event_exists boolean;
  v_existing_attendee_id uuid;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Check if the user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Check if the event exists
  SELECT EXISTS(
    SELECT 1 FROM events WHERE id = event_id_input
  ) INTO v_event_exists;
  
  IF NOT v_event_exists THEN
    RAISE EXCEPTION 'Event not found';
  END IF;
  
  -- Check if the user already has an RSVP for this event
  SELECT id INTO v_existing_attendee_id
  FROM event_attendees
  WHERE event_id = event_id_input AND user_id = v_user_id;
  
  -- If the user already has an RSVP, update it
  IF v_existing_attendee_id IS NOT NULL THEN
    UPDATE event_attendees
    SET 
      status = new_status,
      responded_at = NOW()
    WHERE id = v_existing_attendee_id;
  ELSE
    -- Otherwise, create a new RSVP
    INSERT INTO event_attendees (
      event_id,
      user_id,
      status,
      responded_at,
      role
    ) VALUES (
      event_id_input,
      v_user_id,
      new_status,
      NOW(),
      'attendee'
    );
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_rsvp_status(uuid, rsvp_status) TO authenticated;

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_upcoming_events_with_rsvp(uuid);

-- Create the corrected function with properly qualified column references
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
  event_status event_status_type,
  creator_id uuid,
  memorial_id uuid,
  event_type_id uuid,
  organization_id uuid,
  hero_media_url text,
  hero_media_type media_type_enum,
  deceased_description text,
  tags text[],
  created_at timestamptz,
  updated_at timestamptz,
  user_rsvp_status rsvp_status,
  creator_name text,
  creator_avatar_url text,
  memorial_title text,
  event_type_name text
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
    e.status AS event_status,
    e.creator_id,
    e.memorial_id,
    e.event_type_id,
    e.organization_id,
    e.hero_media_url,
    e.hero_media_type,
    e.deceased_description,
    e.tags,
    e.created_at,
    e.updated_at,
    COALESCE(ea.status, 'invited'::rsvp_status) AS user_rsvp_status,
    p.full_name AS creator_name,
    p.avatar_url AS creator_avatar_url,
    m.title AS memorial_title,
    et.name_en AS event_type_name
  FROM events e
  LEFT JOIN event_attendees ea ON e.id = ea.event_id AND ea.user_id = user_id_param
  LEFT JOIN profiles p ON e.creator_id = p.id
  LEFT JOIN memorials m ON e.memorial_id = m.id
  LEFT JOIN event_types et ON e.event_type_id = et.id
  WHERE 
    e.start_time > NOW()
    AND e.status = 'published'::event_status_type
    AND (
      e.visibility = 'public'::event_visibility_enum
      OR e.creator_id = user_id_param
      OR (e.memorial_id IS NOT NULL AND can_view_memorial(e.memorial_id))
      OR (
        e.visibility IN ('family_only'::event_visibility_enum, 'invitees_only'::event_visibility_enum)
        AND ea.user_id = user_id_param
      )
    )
  ORDER BY e.start_time ASC
  LIMIT 10;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_upcoming_events_with_rsvp(uuid) TO authenticated;