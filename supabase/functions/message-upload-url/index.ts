import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface UploadUrlPayload {
  message_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { message_id, file_name, file_size, mime_type }: UploadUrlPayload = await req.json();

    if (!message_id || !file_name || !file_size || !mime_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file size (20MB limit)
    if (file_size > 20 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "File too large (max 20MB)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is the message author
    const { data: message, error: messageError } = await supabaseClient
      .from("messages")
      .select("sender_id")
      .eq("id", message_id)
      .single();

    if (messageError || !message || message.sender_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Message not found or unauthorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate unique file path
    const fileExtension = file_name.split('.').pop() || '';
    const uniqueFileName = `${crypto.randomUUID()}.${fileExtension}`;
    const filePath = `attachments/${message_id}/${uniqueFileName}`;

    // Create signed upload URL
    const { data: signedUrl, error: urlError } = await supabaseClient.storage
      .from("attachments")
      .createSignedUploadUrl(filePath);

    if (urlError) {
      console.error("Error creating signed URL:", urlError);
      
      // Log error
      await supabaseClient.from("event_log").insert({
        user_id: user.id,
        name: "upload_url_error",
        props: { message_id, error: urlError.message },
      });

      return new Response(
        JSON.stringify({ error: "Failed to create upload URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create attachment record
    const { error: attachmentError } = await supabaseClient
      .from("message_attachments")
      .insert({
        message_id,
        file_path: filePath,
        mime_type,
        size_bytes: file_size,
      });

    if (attachmentError) {
      console.error("Error creating attachment record:", attachmentError);
      
      // Log error
      await supabaseClient.from("event_log").insert({
        user_id: user.id,
        name: "attachment_record_error",
        props: { message_id, error: attachmentError.message },
      });

      return new Response(
        JSON.stringify({ error: "Failed to create attachment record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log success
    await supabaseClient.from("event_log").insert({
      user_id: user.id,
      name: "upload_url_success",
      props: { message_id, file_path: filePath },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        upload_url: signedUrl.signedUrl,
        file_path: filePath 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Message upload URL error:", error);
    
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});