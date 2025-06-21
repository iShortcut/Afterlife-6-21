// Last updated in chat: 2025-06-14 18:05:14
// supabase/functions/send-event-invitations/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'; // Needed for logging to DB

function EmailTemplate({ eventTitle, dateTime, location, eventUrl, memorialUrl, memorialTitle, creatorName }) {
    const memorialRow = memorialTitle && memorialUrl ? `<p><strong>Memorial:</strong> <a href="${memorialUrl}">${memorialTitle}</a></p>` : '';
    return `
        <!DOCTYPE html>
        <html>
        <head><title>Event Invitation: ${eventTitle}</title></head>
        <body>
        <p>Hello,</p>
        <p>${creatorName || 'A friend'} has invited you to the event: <strong>${eventTitle}</strong></p>
        <p><strong>When:</strong> ${dateTime}</p>
        <p><strong>Where:</strong> ${location}</p>
        ${memorialRow}
        <p><a href="${eventUrl}">View Event Details</a></p>
        </body>
        </html>
    `;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    try {
        const { eventId, emails, eventDetails } = await req.json();

        console.log('Received payload for send-event-invitations:', { eventId, emails, eventDetails });

        if (!eventId || !emails || !Array.isArray(emails) || emails.length === 0 || !eventDetails) {
            console.error('Missing required parameters in send-event-invitations:', { eventId, emails, eventDetails });
            return new Response(JSON.stringify({ error: "Missing required parameters" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (!resendApiKey) {
            throw new Error("RESEND_API_KEY is not set in Edge Function secrets.");
        }

        const startDate = new Date(eventDetails.startTime);
        const dateTimeDisplay = `${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString()}`;

        const baseUrl = Deno.env.get("APP_URL") || "http://localhost:5173"; // Use APP_URL
        const eventUrl = `${baseUrl}/events/${eventId}`;
        const memorialUrl = eventDetails.memorialId ? `${baseUrl}/memorials/${eventDetails.memorialId}` : null;

        const emailPromises = emails.map(async (email: string) => {
            // Check for duplicates before actually sending the email (optional but recommended)
            const { data: existingLog, error: logError } = await supabaseAdmin
                .from('email_logs')
                .select('id')
                .eq('event_id', eventId)
                .eq('recipient_email', email)
                .eq('mail_type', 'event_invitation')
                .eq('status', 'sent') // Check if already sent successfully
                .maybeSingle(); // Returns null if no record found

            if (existingLog) {
                console.log(`Email to ${email} for event ${eventId} already sent. Skipping.`);
                return { email, status: 'skipped', message: 'Already sent' };
            }
            if (logError) {
                console.error(`Error checking existing email log for ${email}:`, logError);
                // Decide if to continue or throw
            }

            const htmlContent = EmailTemplate({
                eventTitle: eventDetails.title,
                dateTime: dateTimeDisplay,
                location: eventDetails.location || "No location specified",
                eventUrl,
                memorialUrl,
                memorialTitle: eventDetails.memorialTitle,
                creatorName: eventDetails.creatorName
            });

            console.log(`Attempting to send email to: ${email} for event ${eventId}`);
            let resendResponseStatus: string;
            let resendErrorMessage: string | null = null;
            let resendId: string | null = null;

            try {
                const response = await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${resendApiKey}`,
                    },
                    body: JSON.stringify({
                        from: 'Afterlife <info@ishortcut.co.il>', // Ensure this is a verified sender in Resend
                        to: email,
                        subject: `You're Invited: ${eventDetails.title}`,
                        html: htmlContent,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error(`Error sending email to ${email} (Resend API response):`, errorData);
                    resendResponseStatus = 'failed';
                    resendErrorMessage = JSON.stringify(errorData);
                } else {
                    const successData = await response.json();
                    console.log(`Email sent successfully to ${email}:`, successData);
                    resendResponseStatus = 'sent';
                    resendId = successData.id;
                }
            } catch (fetchError: any) {
                console.error(`Network or unexpected error sending email to ${email}:`, fetchError);
                resendResponseStatus = 'failed';
                resendErrorMessage = fetchError.message || 'Network error during email send';
            }

            // Log email status to email_logs table
            const { error: insertLogError } = await supabaseAdmin.from('email_logs').insert({
                event_id: eventId,
                recipient_email: email,
                status: resendResponseStatus,
                error_message: resendErrorMessage,
                mail_type: 'event_invitation',
                resend_id: resendId
            });

            if (insertLogError) {
                console.error(`Error logging email status for ${email}:`, insertLogError);
            }

            return { email, status: resendResponseStatus, resendId, errorMessage: resendErrorMessage };
        });

        const results = await Promise.all(emailPromises);

        return new Response(JSON.stringify({ success: true, results, message: "Emails processed for sending." }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        console.error("Error in send-event-invitations Edge Function:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});