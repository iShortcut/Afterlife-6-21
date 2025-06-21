-- Migration to fix remaining RLS errors on chat_participants and memorial_shares

DO $$
DECLARE
    policy_rec RECORD;
BEGIN
    -- Fix chat_participants RLS
    -- Ensure RLS is enabled
    ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies on chat_participants
    FOR policy_rec IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_participants' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.chat_participants;', policy_rec.policyname);
    END LOOP;

    -- Create new simplified, non-recursive policies for chat_participants

    -- SELECT: Allow users to see *their own* participation records ONLY.
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow SELECT self participation record' AND polrelid = 'public.chat_participants'::regclass) THEN
        CREATE POLICY "Allow SELECT self participation record" ON public.chat_participants
        FOR SELECT
        USING ( auth.uid() = user_id );
    END IF;

    -- INSERT: Allow inserting self
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow INSERT for self' AND polrelid = 'public.chat_participants'::regclass) THEN
        CREATE POLICY "Allow INSERT for self" ON public.chat_participants
        FOR INSERT
        WITH CHECK ( auth.uid() = user_id );
    END IF;

    -- DELETE: Allow deleting self
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow DELETE for self' AND polrelid = 'public.chat_participants'::regclass) THEN
         CREATE POLICY "Allow DELETE for self" ON public.chat_participants
         FOR DELETE
         USING ( auth.uid() = user_id );
    END IF;

    -- Fix memorial_shares RLS (Add missing SELECT policy for recipient)
    -- Ensure RLS is enabled
    ALTER TABLE public.memorial_shares ENABLE ROW LEVEL SECURITY;

    -- Add SELECT policy for the recipient (if it doesn't exist)
    -- Assumes get_user_email function exists from previous migration
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow recipient to view their shares' AND polrelid = 'public.memorial_shares'::regclass) THEN
         -- Ensure the helper function exists before creating the policy that uses it
         IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE p.proname = 'get_user_email' AND n.nspname = 'public') THEN
             CREATE POLICY "Allow recipient to view their shares" ON public.memorial_shares
             FOR SELECT
             USING (
                 auth.uid() = shared_with_user_id -- Shared directly by user ID
                 OR
                 -- Shared via email - Requires secure lookup via function
                 (shared_with_email IS NOT NULL AND shared_with_email = public.get_user_email(auth.uid()))
             );
         END IF;
    END IF;

    -- Ensure existing policy allowing owner/sharer to manage shares exists
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow owner/sharer to manage shares' AND polrelid = 'public.memorial_shares'::regclass) THEN
         CREATE POLICY "Allow owner/sharer to manage shares" ON public.memorial_shares
         FOR ALL USING (
             (auth.uid() = shared_by_user_id) OR
             (memorial_id IN (SELECT id FROM public.memorials WHERE owner_id = auth.uid()))
         );
    END IF;

END $$;