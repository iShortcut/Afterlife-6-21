// Last updated in chat: 2025-06-18 10:00:00 (approx) - CORS fix: Inlined corsHeaders
// supabase/functions/handle-new-rsvp-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
// import { corsHeaders } from "../_shared/cors.ts"; // <-- הסר/הסירי שורה זו

// הטמעת corsHeaders ישירות בתוך הפונקציה
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // <-- ודא/י שזה כוכבית
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { event_id, user_id, status } = await req.json();

        console.log('handle-new-rsvp-notification: Received payload:', { event_id, user_id, status });

        if (!event_id || !user_id || !status) {
            console.error('handle-new-rsvp-notification: Missing event_id, user_id, or status in payload.');
            throw new Error('Missing event_id, user_id, or status');
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

        // Fetch event details to get creator_id for notification recipient, and memorial_id for memorial title
        console.log('handle-new-rsvp-notification: Fetching event details for event_id:', event_id);
        const { data: eventData, error: eventError } = await supabaseAdmin
            .from('events')
            .select('id, title, creator_id, memorial_id')
            .eq('id', event_id)
            .maybeSingle();

        if (eventError && eventError.code !== 'PGRST116') {
            console.error('handle-new-rsvp-notification: Error fetching event data:', eventError?.message);
            throw new Error('Event not found or cannot be accessed.');
        }
        if (!eventData) {
            console.error('handle-new-rsvp-notification: Event data not found for ID:', event_id);
            throw new Error('Event not found or cannot be accessed.');
        }
        console.log('handle-new-rsvp-notification: Event data fetched:', eventData);


        // Fetch memorial title if available
        let memorialTitle: string | null = null;
        if (eventData.memorial_id) {
            console.log('handle-new-rsvp-notification: Fetching memorial details for ID:', eventData.memorial_id);
            const { data: memorialData, error: memorialError } = await supabaseAdmin
                .from('memorials')
                .select('title')
                .eq('id', eventData.memorial_id)
                .maybeSingle();

            if (memorialError && memorialError.code !== 'PGRST116') {
                console.warn('handle-new-rsvp-notification: Could not fetch memorial title:', memorialError.message);
            } else if (memorialData) {
                memorialTitle = memorialData.title;
                console.log('handle-new-rsvp-notification: Memorial title fetched:', memorialTitle);
            } else {
                console.log('handle-new-rsvp-notification: No memorial data found for ID:', eventData.memorial_id);
            }
        }

        // Fetch user data (the attendee/inviter) to get their name
        console.log('handle-new-rsvp-notification: Fetching user profile for user_id:', user_id);
        const { data: userData, error: userError } = await supabaseAdmin
            .from('profiles')
            .select('full_name')
            .eq('id', user_id)
            .maybeSingle();

        const senderName = userData?.full_name || 'A user';
        if (userError && userError.code !== 'PGRST116') {
            console.warn('handle-new-rsvp-notification: Could not fetch sender name:', userError.message);
        }
        console.log('handle-new-rsvp-notification: Sender name resolved to:', senderName);


        let notificationType: 'EVENT_RSVP_CHANGE' | 'EVENT_INVITATION';
        let notificationMessage: string;

        // Helper function to format status for display
        const statusDisplay = (dbStatus: string) => {
            switch (dbStatus) {
                case 'accepted': return 'Accepted';
                case 'maybe': return 'Maybe';
                case 'declined': return 'Declined';
                case 'invited': return 'Invited';
                default: return dbStatus;
            }
        };

        const eventTitlePart = eventData.title ? `'${eventData.title}'` : 'an event';
        const memorialPartString = memorialTitle ? ` of memorial '${memorialTitle}'` : '';

        if (status === 'invited') {
            notificationType = 'EVENT_INVITATION';
            notificationMessage = `<span class="math-inline">\{senderName\} \(</span>{statusDisplay(status)}) <span class="math-inline">\{eventTitlePart\}</span>{memorialPartString}.`;
        } else {
            notificationType = 'EVENT_RSVP_CHANGE';
            notificationMessage = `<span class="math-inline">\{senderName\} \(</span>{statusDisplay(status)}) <span class="math-inline">\{eventTitlePart\}</span>{memorialPartString}.`;
        }

        const notification = {
            recipient_id: eventData.creator_id,
            sender_id: user_id,
            type: notificationType,
            entity_type: 'EVENT',
            entity_id: event_id,
            message: notificationMessage,
            is_read: false,
        };
        console.log('handle-new-rsvp-notification: Notification object prepared:', { ...notification, message: notificationMessage });


        console.log('handle-new-rsvp-notification: Attempting to upsert notification...');

        const { error: notifyError, data: upsertedData } = await supabaseAdmin
            .from("notifications")
            .upsert(notification, { onConflict: ['recipient_id', 'entity_id', 'type'] })
            .select();

        if (notifyError) {
            console.error("handle-new-rsvp-notification: Error upserting notification:", notifyError);
            throw notifyError;
        }
        console.log('handle-new-rsvp-notification: Upsert notification result (data):', upsertedData);

        return new Response(JSON.stringify({ success: true, message: "Notification processed." }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        console.error("handle-new-rsvp-notification: Function Error (catch block):", error.message);
        return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});