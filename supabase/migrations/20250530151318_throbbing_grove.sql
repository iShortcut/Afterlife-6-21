-- Create event_location_type enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_location_type') THEN
    CREATE TYPE event_location_type AS ENUM ('physical', 'online');
  END IF;
END $$;

-- Add missing columns to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS location_text TEXT,
ADD COLUMN IF NOT EXISTS location_type event_location_type NOT NULL DEFAULT 'physical',
ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Create event_types table if it doesn't exist
CREATE TABLE IF NOT EXISTS event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  description_en text,
  icon text,
  religion text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create unique index on name_en
CREATE UNIQUE INDEX IF NOT EXISTS event_types_name_en_key ON event_types(name_en);

-- Enable RLS on event_types
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Allow admin to manage event types' 
    AND polrelid = 'event_types'::regclass
  ) THEN
    CREATE POLICY "Allow admin to manage event types"
      ON event_types
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Allow read access to authenticated users on event_types' 
    AND polrelid = 'event_types'::regclass
  ) THEN
    CREATE POLICY "Allow read access to authenticated users on event_types"
      ON event_types
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Populate event types with religious categories if the table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM event_types WHERE religion IS NOT NULL LIMIT 1) THEN
    INSERT INTO event_types (name_en, description_en, religion, sort_order)
    VALUES
      -- Judaism
      ('Passing Announcement', 'Announcement of death', 'Judaism', 100),
      ('Funeral and Burial Service', 'Jewish funeral service', 'Judaism', 101),
      ('Shiva', 'Seven-day mourning period', 'Judaism', 102),
      ('Shloshim', 'Thirty-day mourning period', 'Judaism', 103),
      ('Gravestone Unveiling', 'Unveiling ceremony', 'Judaism', 104),
      ('End of Mourning Year Ceremony', 'End of mourning year', 'Judaism', 105),
      ('Annual Yahrzeit', 'Annual remembrance', 'Judaism', 106),
      
      -- Christianity
      ('Wake / Vigil', 'Pre-funeral gathering', 'Christianity', 200),
      ('Funeral Service / Requiem Mass / Funeral Liturgy', 'Christian funeral service', 'Christianity', 201),
      ('Committal Service', 'Burial service', 'Christianity', 202),
      ('Repast / Reception / Post-funeral gathering', 'Post-funeral gathering', 'Christianity', 203),
      ('Third Day Memorial', 'Memorial on the third day', 'Christianity', 204),
      ('Ninth Day Memorial', 'Memorial on the ninth day', 'Christianity', 205),
      ('Fortieth Day Memorial (Panikhida)', 'Memorial on the fortieth day', 'Christianity', 206),
      ('Six Month Memorial', 'Memorial at six months', 'Christianity', 207),
      ('One Year Memorial', 'Memorial at one year', 'Christianity', 208),
      ('All Souls'' Day', 'Commemoration of the faithful departed', 'Christianity', 209),
      ('Soul Saturdays', 'Eastern Orthodox memorial days', 'Christianity', 210),
      ('Radonitsa', 'Eastern Orthodox memorial day', 'Christianity', 211),
      
      -- Islam
      ('Ghusl al-Mayyit', 'Ritual washing of the deceased', 'Islam', 300),
      ('Salat al-Janazah', 'Funeral prayer', 'Islam', 301),
      ('Tashyi'' al-Janazah', 'Funeral procession', 'Islam', 302),
      ('Al-Dafn', 'Burial', 'Islam', 303),
      ('Al-''Aza'' / Al-Ta''ziyah', 'Condolence gathering', 'Islam', 304),
      ('Majalis al-Khatm', 'Quran recitation gatherings', 'Islam', 305),
      ('Majalis al-Dhikr', 'Remembrance gatherings', 'Islam', 306),
      ('Ziyarat al-Qubur', 'Visiting graves', 'Islam', 307),
      
      -- General, National, Commemorative & Interfaith Events
      ('Interfaith Ceremony / Service', 'Multi-faith memorial service', 'Interfaith', 400),
      ('Annual Remembrance Event', 'Yearly memorial gathering', 'General', 401),
      ('Digital Memorial Launch', 'Launch of online memorial', 'General', 402),
      ('Community Gathering / Vigil', 'Community memorial event', 'General', 403),
      ('Charity Event in Memory', 'Charitable event honoring the deceased', 'General', 404),
      ('Remembrance Day', 'General day of remembrance', 'General', 405),
      ('Fallen Soldiers / War Martyrs Remembrance Day', 'Military memorial day', 'National', 406),
      ('Holocaust Remembrance Day', 'Holocaust memorial day', 'National', 407),
      ('International Holocaust Remembrance Day', 'International Holocaust memorial day', 'National', 408),
      ('National Day of Remembrance', 'Country-specific remembrance day', 'National', 409),
      ('Memorial Day', 'National memorial day', 'National', 410),
      ('Organizational Memorial / Remembrance Event', 'Organization-specific memorial', 'General', 411);
  END IF;
END $$;

-- Create function to send event invitation emails
CREATE OR REPLACE FUNCTION send_event_invitation_emails()
RETURNS TRIGGER AS $$
DECLARE
  event_details RECORD;
  attendee RECORD;
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
  
  -- Here you would typically call an external email service
  -- This is a placeholder for the actual email sending logic
  -- In a real implementation, you would use a service like SendGrid, Mailgun, etc.
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for sending invitation emails
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

-- Create function to update memorial last_content_update_at when events are modified
CREATE OR REPLACE FUNCTION update_memorial_last_content_update()
RETURNS TRIGGER AS $$
BEGIN
  -- For INSERT or UPDATE operations
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    -- Update the memorial's last_content_update_at timestamp
    IF NEW.memorial_id IS NOT NULL THEN
      UPDATE memorials
      SET last_content_update_at = NOW()
      WHERE id = NEW.memorial_id;
    END IF;
    RETURN NEW;
  -- For DELETE operations
  ELSIF (TG_OP = 'DELETE') THEN
    -- Update the memorial's last_content_update_at timestamp
    IF OLD.memorial_id IS NOT NULL THEN
      UPDATE memorials
      SET last_content_update_at = NOW()
      WHERE id = OLD.memorial_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating memorial last_content_update_at
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_events_update_memorial_timestamp' 
    AND tgrelid = 'events'::regclass
  ) THEN
    CREATE TRIGGER trg_events_update_memorial_timestamp
      AFTER INSERT OR DELETE OR UPDATE ON events
      FOR EACH ROW
      EXECUTE FUNCTION update_memorial_last_content_update();
  END IF;
END $$;