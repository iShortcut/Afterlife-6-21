-- Migration to fix RLS policies on chat_participants

DO $$
DECLARE
    policy_rec RECORD;
BEGIN
    -- Ensure RLS is enabled
    ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

    -- Drop potentially problematic old policies first
    FOR policy_rec IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_participants' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.chat_participants;', policy_rec.policyname);
    END LOOP;

    -- Create new, non-recursive policies

    -- SELECT: Allow users to see participants only in threads they are part of.
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow SELECT on participants in own threads' AND polrelid = 'public.chat_participants'::regclass) THEN
        CREATE POLICY "Allow SELECT on participants in own threads" ON public.chat_participants
        FOR SELECT
        USING (
          auth.uid() IN (
            -- Find all users in the same thread as the row being checked
            SELECT cp.user_id FROM public.chat_participants cp WHERE cp.thread_id = chat_participants.thread_id
          )
        );
    END IF;

    -- INSERT: Allow authenticated users to add themselves (or be added) to a thread.
    -- Assumption: The user_id being inserted must match the logged-in user.
    -- Adjust if different logic is needed (e.g., thread creator can add others).
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow INSERT for self' AND polrelid = 'public.chat_participants'::regclass) THEN
        CREATE POLICY "Allow INSERT for self" ON public.chat_participants
        FOR INSERT
        WITH CHECK ( auth.uid() = user_id );
    END IF;

    -- DELETE: Allow users to remove themselves from a thread.
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow DELETE for self' AND polrelid = 'public.chat_participants'::regclass) THEN
         CREATE POLICY "Allow DELETE for self" ON public.chat_participants
         FOR DELETE
         USING ( auth.uid() = user_id );
    END IF;

END $$;