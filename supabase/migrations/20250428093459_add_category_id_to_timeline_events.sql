-- Migration to add category_id column to timeline_events table

ALTER TABLE public.timeline_events
ADD COLUMN IF NOT EXISTS category_id UUID
REFERENCES public.timeline_event_categories(id)
ON DELETE SET NULL; -- הגדרה: אם קטגוריה נמחקת, השדה הזה באירוע יהפוך ל-NULL

COMMENT ON COLUMN public.timeline_events.category_id IS 'Foreign key linking timeline event to its category in timeline_event_categories.';

-- Note: Applying this migration should also refresh the schema cache (relevant to PGRST204 error).