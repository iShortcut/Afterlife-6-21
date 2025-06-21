// Follow Deno and Supabase Edge Functions conventions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface RequestBody {
  event_id: string;
  target_user_id: string;
  new_role: 'co_manager' | 'attendee';
  acting_user_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { event_id, target_user_id, new_role, acting_user_id } = await req.json() as RequestBody;

    // Validate required parameters
    if (!event_id || !target_user_id || !new_role || !acting_user_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required parameters" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Validate role value
    if (!['co_manager', 'attendee'].includes(new_role)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid role value. Must be 'co_manager' or 'attendee'." }),
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
      .select("creator_id, title")
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
        JSON.stringify({ success: false, error: "Unauthorized. Only the event creator or an admin can manage co-manager roles." }),
        { 
          status: 403, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // 2. Validate that target_user_id is an existing participant
    const { data: attendeeData, error: attendeeError } = await supabase
      .from("event_attendees")
      .select("id, role, status")
      .eq("event_id", event_id)
      .eq("user_id", target_user_id)
      .single();

    if (attendeeError) {
      console.error("Error fetching attendee:", attendeeError);
      return new Response(
        JSON.stringify({ success: false, error: "Target user is not a participant in this event" }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // 3. Prevent demoting the original event creator
    if (target_user_id === eventData.creator_id && new_role === 'attendee') {
      return new Response(
        JSON.stringify({ success: false, error: "Cannot demote the original event creator" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // 4. Update the role
    const oldRole = attendeeData.role || 'attendee';
    
    const { error: updateError } = await supabase
      .from("event_attendees")
      .update({ role: new_role })
      .eq("event_id", event_id)
      .eq("user_id", target_user_id);

    if (updateError) {
      console.error("Error updating attendee role:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to update attendee role" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // 5. Log this action to audit_logs
    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert({
        action: "EVENT_ROLE_CHANGED",
        performed_by: acting_user_id,
        target_type: "EVENT_ATTENDEE",
        target_id: attendeeData.id,
        description: `Changed role of user ${target_user_id} from ${oldRole} to ${new_role} for event ${event_id}`,
        metadata: {
          event_id,
          target_user_id,
          old_role: oldRole,
          new_role,
          event_title: eventData.title
        }
      });

    if (auditError) {
      console.error("Error logging to audit_logs:", auditError);
      // Don't fail the whole operation if audit logging fails
    }

    // 6. Create a notification for the target user
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        recipient_id: target_user_id,
        sender_id: acting_user_id,
        type: new_role === 'co_manager' ? 'ROLE_PROMOTION' : 'ROLE_DEMOTION',
        entity_type: 'EVENT',
        entity_id: event_id,
        message: new_role === 'co_manager' 
          ? `You have been made a co-manager for event "${eventData.title}"`
          : `Your co-manager role for event "${eventData.title}" has been removed`,
        metadata: {
          event_id,
          event_title: eventData.title,
          old_role: oldRole,
          new_role
        }
      });

    if (notificationError) {
      console.error("Error creating notification:", notificationError);
      // Don't fail the whole operation if notification creation fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User role updated to ${new_role}`,
        data: {
          event_id,
          target_user_id,
          previous_role: oldRole,
          new_role
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Error processing role change:", error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});