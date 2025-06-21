-- ========================================================================
-- תוכן מתוקן ובטוח לקובץ המיגרציה: 20250426104829_plain_shape.sql
-- מנקה ומגדיר מחדש את RLS Policies עבור טבלת memorials
-- =========================================================================

DO $$
DECLARE
    policy_rec RECORD;
    policy_select_exists BOOLEAN;
    policy_insert_exists BOOLEAN;
    policy_update_exists BOOLEAN;
    policy_delete_exists BOOLEAN;
BEGIN
    RAISE NOTICE '--- Starting Clean Slate RLS setup for memorials (Migration: 20250426104829) ---';

    -- שלב 0: וידוא קיום פונקציות נדרשות (להיות בטוחים)
    RAISE NOTICE 'Step 0: Ensuring required functions exist...';
    -- Function for updated_at trigger (assuming it exists from previous migration/task)
    -- If unsure, uncomment the CREATE OR REPLACE block below
    /*
    CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
    RETURNS TRIGGER AS $trigger_func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $trigger_func$ LANGUAGE plpgsql;
    RAISE NOTICE 'Function trigger_set_timestamp() created or replaced.';
    */

    -- Function for checking edit permissions (assuming it exists from previous migration/task)
    -- If unsure, uncomment the CREATE OR REPLACE block below
    /*
    CREATE OR REPLACE FUNCTION public.can_edit_memorial(memorial_id uuid, user_id uuid)
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $function$
    DECLARE
      is_owner boolean;
      has_edit_permission boolean;
      user_email TEXT;
    BEGIN
      SELECT EXISTS (
        SELECT 1 FROM public.memorials m WHERE m.id = memorial_id AND m.owner_id = user_id
      ) INTO is_owner;
      IF is_owner THEN RETURN true; END IF;

      SELECT u.email INTO user_email FROM auth.users u WHERE u.id = user_id;
      SELECT EXISTS (
        SELECT 1 FROM public.memorial_shares ms
        WHERE ms.memorial_id = memorial_id
        AND ms.permission_level = 'edit'
        AND (ms.shared_with_user_id = user_id OR (ms.shared_with_email IS NOT NULL AND ms.shared_with_email = user_email))
      ) INTO has_edit_permission;
      RETURN has_edit_permission;
    END;
    $function$;
    RAISE NOTICE 'Function can_edit_memorial created or replaced.';
    */

    -- שלב 1: מחיקת כל ה-Policies הקיימות על טבלת memorials
    RAISE NOTICE 'Step 1: Dropping ALL existing policies on public.memorials...';
    FOR policy_rec IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'memorials' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.memorials;', policy_rec.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_rec.policyname;
    END LOOP;
    RAISE NOTICE 'Finished dropping policies on memorials.';

    -- שלב 2: יצירת סט Policies חדש ובטוח עבור memorials
    RAISE NOTICE 'Step 2: Creating new standard RLS policies for memorials...';

    -- מדיניות SELECT: ציבורי, או בעלים, או שותף (עם הרשאת צפייה)
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow SELECT public, owner, or shared viewer' AND polrelid = 'public.memorials'::regclass) THEN
        CREATE POLICY "Allow SELECT public, owner, or shared viewer" ON public.memorials
        FOR SELECT USING (
            visibility = 'public'
            OR
            (auth.role() = 'authenticated' AND auth.uid() = owner_id)
            OR
            (auth.role() = 'authenticated' AND id IN (
                SELECT ms.memorial_id FROM public.memorial_shares ms LEFT JOIN auth.users u ON ms.shared_with_email = u.email
                WHERE (ms.shared_with_user_id = auth.uid() OR u.id = auth.uid()) AND ms.permission_level = 'view' AND ms.memorial_id = memorials.id
            ))
        );
        RAISE NOTICE 'Created SELECT policy "Allow SELECT public, owner, or shared viewer".';
    ELSE
        RAISE NOTICE 'SELECT policy "Allow SELECT public, owner, or shared viewer" already exists.';
    END IF;

    -- מדיניות INSERT: רק משתמשים מאומתים, הקוד צריך לדאוג לשיוך ל-owner_id
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow INSERT for authenticated users' AND polrelid = 'public.memorials'::regclass) THEN
         CREATE POLICY "Allow INSERT for authenticated users" ON public.memorials
         FOR INSERT WITH CHECK ( auth.role() = 'authenticated' );
        RAISE NOTICE 'Created INSERT policy "Allow INSERT for authenticated users".';
    ELSE
        RAISE NOTICE 'INSERT policy "Allow INSERT for authenticated users" already exists.';
    END IF;

    -- מדיניות UPDATE: רק בעלים או שותף עם הרשאת עריכה (דורש את הפונקציה can_edit_memorial)
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow UPDATE for owner or shared editor' AND polrelid = 'public.memorials'::regclass) THEN
         -- ודא קיום הפונקציה לפני יצירת ה-Policy שתלוי בה
         IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE p.proname = 'can_edit_memorial' AND n.nspname = 'public') THEN
             CREATE POLICY "Allow UPDATE for owner or shared editor" ON public.memorials
             FOR UPDATE USING (public.can_edit_memorial(id, auth.uid())) WITH CHECK (public.can_edit_memorial(id, auth.uid()));
             RAISE NOTICE 'Created UPDATE policy "Allow UPDATE for owner or shared editor".';
         ELSE
             RAISE NOTICE 'Function can_edit_memorial not found. Skipping UPDATE policy creation.';
         END IF;
    ELSE
        RAISE NOTICE 'UPDATE policy "Allow UPDATE for owner or shared editor" already exists.';
    END IF;

    -- מדיניות DELETE: רק בעלים
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow DELETE for owner only' AND polrelid = 'public.memorials'::regclass) THEN
        CREATE POLICY "Allow DELETE for owner only" ON public.memorials
        FOR DELETE USING ( auth.uid() = owner_id );
        RAISE NOTICE 'Created DELETE policy "Allow DELETE for owner only".';
    ELSE
        RAISE NOTICE 'DELETE policy "Allow DELETE for owner only" already exists.';
    END IF;

    RAISE NOTICE '--- Finished Clean Slate RLS setup for memorials (Migration: 20250426104829) ---';

END;
$$;