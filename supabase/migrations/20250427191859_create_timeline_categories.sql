-- Migration to create timeline_event_categories table

-- Create the table only if it doesn't exist
CREATE TABLE IF NOT EXISTS public.timeline_event_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.timeline_event_categories IS 'Categories for timeline events (e.g., Birth, Marriage, Achievement).';

-- Enable RLS (standard practice, define detailed policies later if needed)
ALTER TABLE public.timeline_event_categories ENABLE ROW LEVEL SECURITY;

-- Create a basic read policy if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow read access to authenticated users' AND polrelid = 'public.timeline_event_categories'::regclass) THEN
        CREATE POLICY "Allow read access to authenticated users"
            ON public.timeline_event_categories
            FOR SELECT
            USING (auth.role() = 'authenticated');
    END IF;
END $$;
-- Note: Add INSERT/UPDATE/DELETE policies later based on application requirements.

-- Apply the standard timestamp trigger (assuming function trigger_set_timestamp exists)
DO $$ BEGIN
    -- Ensure the trigger function exists before attempting to create the trigger
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE p.proname = 'trigger_set_timestamp' AND n.nspname = 'public') THEN
        -- Create the trigger only if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp' AND tgrelid = 'public.timeline_event_categories'::regclass) THEN
             EXECUTE format(
                 'CREATE TRIGGER set_timestamp
                    BEFORE UPDATE ON public.timeline_event_categories
                    FOR EACH ROW
                    EXECUTE FUNCTION public.%I()',
                 'trigger_set_timestamp'
             );
        END IF;
    END IF;
END $$;

-- End of migration script