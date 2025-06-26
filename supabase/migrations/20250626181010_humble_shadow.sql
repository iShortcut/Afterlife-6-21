/*
  # Add detailed event information column to events table
  
  1. Changes
    - Add `detailed_event_info` JSONB column to `events` table
    - Set default value to empty JSON object
    - Add comment explaining the column's purpose
  
  2. Security
    - No changes to RLS policies needed as existing policies already cover all columns
*/

-- Add the detailed_event_info column to the events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS detailed_event_info JSONB DEFAULT '{}'::jsonb;

-- Add comment explaining the column's purpose
COMMENT ON COLUMN public.events.detailed_event_info IS 'Structured JSON data containing detailed information about the event such as agenda, specific instructions, and other event-specific details.';

-- No need to modify RLS policies as the existing policies for the events table
-- already handle access control for all columns including the new one.
-- The existing UPDATE policy allows event creators to modify all fields.