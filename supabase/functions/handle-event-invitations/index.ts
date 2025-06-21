// Updated: 2025‑06‑17 – fixed mail_type column name, kept CORS inline
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

// Inline CORS headers (development wildcard)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  // ▸ 1. Pre‑flight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ▸ 2. Parse payload
    const { event_id, invitees } = await req.json();
    console.log("handle-event-invitations: Received payload:", { event_id, invitees });

    if (!event_id || !Array.isArray(invitees) || invitees.length === 0) {
      throw new Error("Missing event ID or invitees");
    }

    // ▸ 3. Admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // ▸ 4. Validate event exists
    const { error: eventError } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("id", event_id)
      .single();

    if (eventError) throw new Error("Event not found or cannot be accessed.");

    // Track outcomes
    const newInvitations: unknown[] = [];
    const successfulEmails: string[] = [];
    const alreadySentEmails: string[] = [];

    // ▸ 5. Iterate invitees
    for (const invitee of invitees) {
      const { email } = invitee;
      if (!email) continue;

      // 5a. Existing invitation check
      const { data: existingInvitation, error: fetchError } = await supabaseAdmin
        .from("event_invitations")
        .select("id")
        .eq("event_id", event_id)
        .eq("email", email)
        .maybeSingle();

      if (fetchError && fetchError.code !== "PGRST116") continue;
      if (existingInvitation) {
        alreadySentEmails.push(email);
        continue;
      }

      // 5b. Email log check (column name fixed to mail_type)
      const { data: emailLog, error: emailLogError } = await supabaseAdmin
        .from("email_logs")
        .select("id")
        .eq("event_id", event_id)
        .eq("recipient_email", email)
        .eq("mail_type", "EVENT_INVITATION") // <-- תיקון כאן: שינוי ל-mail_type
        .maybeSingle();

      if (emailLogError && emailLogError.code !== "PGRST116") continue;
      if (emailLog) {
        alreadySentEmails.push(email);
        continue;
      }

      // 5c. Create invitation
      const { data: invitation, error: invitationError } = await supabaseAdmin
        .from("event_invitations")
        .insert({ event_id, email, status: "invited" })
        .select()
        .single();

      if (invitationError) continue;

      newInvitations.push(invitation);
      successfulEmails.push(email);
    }

    // ▸ 6. Build response message
    let responseMessage = "Invitations processed successfully.";
    if (successfulEmails.length) responseMessage += ` Sent to: ${successfulEmails.join(", ")}.`;
    if (alreadySentEmails.length) responseMessage += ` Already sent to/exist for: ${alreadySentEmails.join(", ")}.`;

    // Email‑sending integration would go here

    return new Response(JSON.stringify({ success: true, message: responseMessage }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("handle-event-invitations: Function Error:", (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});