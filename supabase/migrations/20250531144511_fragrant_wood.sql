-- Create or replace the function to send event invitation emails
CREATE OR REPLACE FUNCTION send_event_invitation_emails()
RETURNS TRIGGER AS $$
DECLARE
  event_details RECORD;
  attendee_email TEXT;
  creator_name TEXT;
  memorial_title TEXT;
BEGIN
  -- Get event details
  SELECT e.title, e.start_time, e.end_time, e.location_text, e.location_type, 
         p.full_name AS creator_name, m.title AS memorial_title
  INTO event_details
  FROM events e
  LEFT JOIN profiles p ON e.creator_id = p.id
  LEFT JOIN memorials m ON e.memorial_id = m.id
  WHERE e.id = NEW.event_id;
  
  -- Get creator name
  IF event_details.creator_name IS NULL THEN
    SELECT full_name INTO creator_name FROM profiles WHERE id = NEW.user_id;
  ELSE
    creator_name := event_details.creator_name;
  END IF;
  
  -- Get attendee email
  SELECT email INTO attendee_email FROM auth.users WHERE id = NEW.user_id;
  
  -- Create notification for the attendee
  INSERT INTO notifications (
    recipient_id,
    sender_id,
    type,
    entity_type,
    entity_id,
    message,
    metadata
  ) VALUES (
    NEW.user_id,
    NEW.user_id, -- Self-notification for now
    'EVENT_INVITE',
    'EVENT',
    NEW.event_id,
    'You have been invited to ' || event_details.title,
    jsonb_build_object(
      'event_title', event_details.title,
      'event_date', event_details.start_time,
      'event_location', event_details.location_text,
      'memorial_title', event_details.memorial_title,
      'creator_name', creator_name
    )
  );
  
  -- Log the email that would be sent (for debugging)
  INSERT INTO audit_logs (
    action,
    performed_by,
    target_type,
    target_id,
    metadata
  ) VALUES (
    'EVENT_INVITATION_EMAIL',
    NEW.user_id,
    'EVENT',
    NEW.event_id::text,
    jsonb_build_object(
      'recipient_email', attendee_email,
      'event_title', event_details.title,
      'event_date', event_details.start_time,
      'event_location', event_details.location_text,
      'memorial_title', event_details.memorial_title,
      'creator_name', creator_name
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_send_event_invitation_emails' 
    AND tgrelid = 'event_attendees'::regclass
  ) THEN
    CREATE TRIGGER trigger_send_event_invitation_emails
      AFTER INSERT ON event_attendees
      FOR EACH ROW
      WHEN (NEW.status = 'invited')
      EXECUTE FUNCTION send_event_invitation_emails();
  END IF;
END $$;

-- Create a function to check if a user has upcoming events
CREATE OR REPLACE FUNCTION check_upcoming_user_events(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_events BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM events e
    LEFT JOIN event_attendees ea ON e.id = ea.event_id
    WHERE 
      (e.creator_id = p_user_id OR ea.user_id = p_user_id)
      AND e.start_time > NOW()
  ) INTO has_events;
  
  RETURN has_events;
END;
$$ LANGUAGE plpgsql;