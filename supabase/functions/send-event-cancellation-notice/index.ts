// Follow Deno and Supabase Edge Functions conventions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../_shared/cors.ts";
import { CancellationEmailTemplate } from "./email-template.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface EventDetails {
  title: string;
  startTime: string;
  location?: string;
  creatorName: string;
  memorialTitle?: string;
  memorialId?: string;
  cancellationReason?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { eventId, emails, eventDetails } = await req.json();

    if (!eventId || !emails || !Array.isArray(emails) || emails.length === 0 || !eventDetails) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Create a Supabase client with the service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Format date and time for display
    const startDate = new Date(eventDetails.startTime);
    const formattedStartDate = startDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedStartTime = startDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const dateTimeDisplay = `${formattedStartDate} at ${formattedStartTime}`;

    // Generate event URL
    const baseUrl = Deno.env.get("SITE_URL") || "http://localhost:5173";
    const memorialUrl = eventDetails.memorialId ? `${baseUrl}/memorials/${eventDetails.memorialId}` : null;

    // Send email to each recipient
    const emailPromises = emails.map(async (email) => {
      // Generate HTML content from template
      const htmlContent = CancellationEmailTemplate({
        eventTitle: eventDetails.title,
        dateTime: dateTimeDisplay,
        location: eventDetails.location || "No location specified",
        memorialUrl,
        memorialTitle: eventDetails.memorialTitle,
        creatorName: eventDetails.creatorName,
        cancellationReason: eventDetails.cancellationReason || "The event has been cancelled by the organizer."
      });

      // Log the email being sent (for debugging)
      console.log(`Sending cancellation email to: ${email}`);

      // Send email using Supabase Auth API
      const { error } = await supabase.auth.admin.sendRawEmail({
        email,
        subject: `Event Cancelled: ${eventDetails.title}`,
        html: htmlContent,
      });

      if (error) {
        console.error(`Error sending email to ${email}:`, error);
        return { email, success: false, error: error.message };
      }

      return { email, success: true };
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r.success).length;

    // Log the cancellation in the audit_logs table
    await supabase.from("audit_logs").insert({
      action: "EVENT_CANCELLATION_NOTICE_SENT",
      target_type: "EVENT",
      target_id: eventId,
      metadata: {
        emails,
        success_count: successCount,
        total_count: emails.length,
        event_details: eventDetails
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${successCount} of ${emails.length} cancellation emails`,
        results 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Error processing cancellation emails:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});