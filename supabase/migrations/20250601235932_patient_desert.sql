/*
  # Add status column to events table

  1. Changes
    - Creates new enum type 'event_status_type' if it doesn't exist
    - Adds 'status' column to events table with default value 'published'
    - Updates any existing events to have 'published' status
    - Adds check constraint to ensure valid status values

  2. Security
    - No changes to RLS policies needed
*/

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'event_status_type'
    ) THEN
        CREATE TYPE public.event_status_type AS ENUM ('draft', 'published', 'cancelled');
    END IF;
END
$$;

ALTER TABLE public.events
ADD COLUMN status public.event_status_type NOT NULL DEFAULT 'published';

-- Update any existing events to have 'published' status if they don't already
UPDATE public.events SET status = 'published' WHERE status IS NULL;

-- Add check constraint to ensure valid status values
ALTER TABLE public.events
ADD CONSTRAINT events_status_check CHECK (status IN ('draft', 'published', 'cancelled'));