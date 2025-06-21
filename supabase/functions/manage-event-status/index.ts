// Follow Deno and Supabase Edge Functions conventions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface RequestBody {
  event_id: string;
  new_status: 'draft' | 'published' | 'cancelled';
  acting_user_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { event_id, new_status, acting_user_id } = await req.json() as RequestBody;

    if (!event_id || !new_status || !acting_user_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required parameters" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Validate status value
    if (!['draft', 'published', 'cancelled'].includes(new_status)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid status value. Must be 'draft', 'published', or 'cancelled'." }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Create a Supabase client with the service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Verify authorization: Check if acting_user_id is the event creator or an admin
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select(`
        creator_id, title, start_time, end_time, location_text, status, memorial_id
      `)
      .eq("id", event_id)
      .single();

    if (eventError) {
      console.error("Error fetching event:", eventError);
      return new Response(
        JSON.stringify({ success: false, error: "Event not found" }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Check if user is the creator
    const isCreator = eventData.creator_id === acting_user_id;

    // Check if user is an admin
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", acting_user_id)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      return new Response(
        JSON.stringify({ success: false, error: "User profile not found" }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const isAdmin = profileData.role === 'ADMIN';

    if (!isCreator && !isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized. Only the event creator or an admin can change event status." }),
        { 
          status: 403, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // 2. Update the event status
    const { error: updateError } = await supabase
      .from("events")
      .update({ status: new_status })
      .eq("id", event_id);

    if (updateError) {
      console.error("Error updating event status:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to update event status" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // 3. Handle status-specific actions
    const oldStatus = eventData.status;
    
    // If status is changed to cancelled, notify attendees
    if (new_status === 'cancelled') {
      // Get all attendees who have accepted or are invited
      const { data: attendeesData, error: attendeesError } = await supabase
        .from("event_attendees")
        .select("user_id, status")
        .eq("event_id", event_id)
        .in("status", ["accepted", "invited", "maybe"]);

      if (attendeesError) {
        console.error("Error fetching attendees for cancellation:", attendeesError);
        // Don't fail the whole operation if we can't fetch attendees
      } else if (attendeesData && attendeesData.length > 0) {
        // Create notifications for all attendees
        const notifications = attendeesData.map(attendee => ({
          recipient_id: attendee.user_id,
          sender_id: acting_user_id,
          type: 'EVENT_CANCELLED',
          entity_type: 'EVENT',
          entity_id: event_id,
          message: `Event "${eventData.title}" has been cancelled`,
          metadata: {
            event_title: eventData.title,
            event_date: eventData.start_time,
            event_location: eventData.location_text
          }
        }));

        // Insert notifications
        const { error: notifyError } = await supabase
          .from("notifications")
          .insert(notifications);

        if (notifyError) {
          console.error("Error creating cancellation notifications:", notifyError);
        }

        // Get emails for all attendees
        const userIds = attendeesData.map(a => a.user_id);
        const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({
          filter: {
            id: {
              in: userIds
            }
          }
        });

        if (!usersError && usersData) {
          const emails = usersData.users.map(u => u.email).filter(Boolean);
          
          if (emails.length > 0) {
            // Call the send-event-cancellation-notice function
            try {
              const { error: cancelError } = await supabase.functions.invoke("send-event-cancellation-notice", {
                body: {
                  eventId: event_id,
                  emails: emails,
                  eventDetails: {
                    title: eventData.title,
                    startTime: eventData.start_time,
                    location: eventData.location_text,
                    creatorName: (await supabase.from("profiles").select("full_name").eq("id", acting_user_id).single()).data?.full_name || "Event Organizer",
                    memorialId: eventData.memorial_id,
                    cancellationReason: "The event has been cancelled by the organizer."
                  }
                }
              });

              if (cancelError) {
                console.error("Error invoking send-event-cancellation-notice:", cancelError);
              }
            } catch (invokeError) {
              console.error("Error invoking send-event-cancellation-notice:", invokeError);
            }
          }
        }
      }
    }

    // 4. Log this action to audit_logs
    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert({
        action: "EVENT_STATUS_CHANGED",
        user_id: acting_user_id,
        entity_type: "EVENT",
        entity_id: event_id,
        description: `Event status changed from ${oldStatus || 'unknown'} to ${new_status}`,
        previous_value: {
          old_status: oldStatus,
          new_status: new_status
        }
      });

    if (auditError) {
      console.error("Error logging to audit_logs:", auditError);
      // Don't fail the whole operation if audit logging fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Event status updated to ${new_status}`,
        data: {
          event_id: event_id,
          previous_status: oldStatus,
          new_status: new_status
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Error processing event status change:", error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});