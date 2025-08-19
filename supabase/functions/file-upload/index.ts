import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface FileUploadPayload {
  bucket: string;
  path: string;
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

    const { bucket, path, file_size, mime_type }: FileUploadPayload = await req.json();

    if (!bucket || !path || !file_size || !mime_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file size based on bucket
    const maxSizes = {
      'avatars': 5 * 1024 * 1024, // 5MB
      'pet-photos': 10 * 1024 * 1024, // 10MB
      'post-media': 50 * 1024 * 1024, // 50MB
      'reel-videos': 100 * 1024 * 1024, // 100MB
      'message-attachments': 20 * 1024 * 1024, // 20MB
      'health-attachments': 10 * 1024 * 1024, // 10MB
    };

    const maxSize = maxSizes[bucket] || 10 * 1024 * 1024;
    if (file_size > maxSize) {
      return new Response(
        JSON.stringify({ error: `File too large (max ${Math.round(maxSize / 1024 / 1024)}MB)` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file type
    const allowedTypes = {
      'avatars': ['image/jpeg', 'image/png', 'image/webp'],
      'pet-photos': ['image/jpeg', 'image/png', 'image/webp'],
      'post-media': ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/mov'],
      'reel-videos': ['video/mp4', 'video/mov', 'video/avi'],
      'message-attachments': ['image/*', 'video/*', 'audio/*', 'application/pdf', 'text/*'],
      'health-attachments': ['image/*', 'application/pdf', 'application/msword'],
    };

    const allowed = allowedTypes[bucket] || ['image/*'];
    const isAllowed = allowed.some(type => {
      if (type.endsWith('/*')) {
        return mime_type.startsWith(type.replace('/*', '/'));
      }
      return mime_type === type;
    });

    if (!isAllowed) {
      return new Response(
        JSON.stringify({ error: "File type not allowed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create signed upload URL
    const { data: signedUrl, error: urlError } = await supabaseClient.storage
      .from(bucket)
      .createSignedUploadUrl(path);

    if (urlError) {
      console.error("Error creating signed URL:", urlError);
      return new Response(
        JSON.stringify({ error: "Failed to create upload URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log upload event
    await supabaseClient.from("app_events").insert({
      user_id: user.id,
      event: "file_upload_url_created",
      meta: { bucket, path, file_size, mime_type },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        upload_url: signedUrl.signedUrl,
        path: signedUrl.path
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("File upload error:", error);
    
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});