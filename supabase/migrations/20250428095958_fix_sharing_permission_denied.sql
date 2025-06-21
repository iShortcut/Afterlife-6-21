-- Migration to fix 'permission denied for table users' error during sharing checks

DO $$
DECLARE
    policy_select_v2_exists BOOLEAN;
BEGIN

    -- Step 1: Create/Replace the secure function to get user email
    CREATE OR REPLACE FUNCTION public.get_user_email(p_user_id uuid)
    RETURNS text
    LANGUAGE sql
    STABLE -- Indicates the function cannot modify the database and always returns the same result for the same arguments within a single transaction.
    SECURITY DEFINER -- Allows the function to run with the privileges of the user who defined it (usually postgres), allowing access to auth.users.
    SET search_path = public, auth -- Ensures the function can find the auth.users table.
    AS $func$
      SELECT email FROM auth.users WHERE id = p_user_id;
    $func$;

    -- Step 2: Update the SELECT policy on memorials to use the new function

    -- Drop the previous SELECT policy (using the name from the 'Clean Slate' script)
    DROP POLICY IF EXISTS "Allow SELECT public, owner, or shared viewer" ON public.memorials;

    -- Create the new SELECT policy using the function (idempotent check)
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow SELECT public, owner, or shared viewer v2' AND polrelid = 'public.memorials'::regclass) THEN
        CREATE POLICY "Allow SELECT public, owner, or shared viewer v2" ON public.memorials
        FOR SELECT USING (
            visibility = 'public'
            OR
            (auth.role() = 'authenticated' AND auth.uid() = owner_id)
            OR
            (
              auth.role() = 'authenticated' AND id IN (
                  SELECT ms.memorial_id
                  FROM public.memorial_shares ms
                  WHERE
                    ms.memorial_id = memorials.id -- Correlate
                    AND ms.permission_level = 'view'
                    AND (
                      ms.shared_with_user_id = auth.uid() -- Match direct user ID
                      OR
                      -- Match via email using the SECURITY DEFINER function
                      (ms.shared_with_email IS NOT NULL AND ms.shared_with_email = public.get_user_email(auth.uid()))
                    )
              )
            )
        );
    END IF;

END $$;