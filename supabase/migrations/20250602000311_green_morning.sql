-- Create a trigger function to call the Edge Function when an RSVP is created or updated
CREATE OR REPLACE FUNCTION notify_rsvp_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_old_status TEXT;
  v_payload JSONB;
BEGIN
  -- For updates, get the old status
  IF (TG_OP = 'UPDATE') THEN
    v_old_status := OLD.status;
  ELSE
    v_old_status := NULL;
  END IF;

  -- Prepare the payload
  v_payload := jsonb_build_object(
    'event_id', NEW.event_id,
    'user_id', NEW.user_id,
    'status', NEW.status,
    'old_status', v_old_status
  );

  -- Call the Edge Function asynchronously
  PERFORM net.http_post(
    url := CASE 
      WHEN current_setting('request.headers', true)::jsonb ? 'origin' 
      THEN regexp_replace(current_setting('request.headers', true)::jsonb->>'origin', '(https?://[^/]+).*', '\1')
      ELSE 'http://localhost:54321'
    END || '/functions/v1/handle-new-rsvp-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.anon_key', true)
    ),
    body := v_payload
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on event_attendees table
DROP TRIGGER IF EXISTS trigger_notify_rsvp_changes ON event_attendees;

CREATE TRIGGER trigger_notify_rsvp_changes
AFTER INSERT OR UPDATE OF status ON event_attendees
FOR EACH ROW
EXECUTE FUNCTION notify_rsvp_changes();

-- Add comment explaining the trigger
COMMENT ON TRIGGER trigger_notify_rsvp_changes ON event_attendees IS 'Trigger to notify event creators and co-managers when someone RSVPs to an event';