import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0'

// הגדרות CORS - מאפשר גישה מהדומיין של האפליקציה
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // מומלץ להחליף בכתובת האפליקציה בפרודקשן
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // טיפול בבקשת preflight של CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // יצירת לקוח סופבייס עם הרשאות מנהל לביצוע פעולות פנימיות
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // קבלת הפרמטרים מהבקשה
    const { event_id, new_status } = await req.json()

    if (!event_id || !new_status) {
      throw new Error('Event ID and new status are required.')
    }

    // קריאה לפונקציית ה-RPC שיצרנו במסד הנתונים
    const { error: rpcError } = await supabaseAdmin.rpc('update_event_attendee_status', {
      event_id_input: event_id,
      new_status: new_status,
    })

    if (rpcError) {
      throw rpcError
    }

    // החזרת תשובה מוצלחת
    return new Response(JSON.stringify({ message: 'RSVP status updated successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    // החזרת תשובת שגיאה
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})