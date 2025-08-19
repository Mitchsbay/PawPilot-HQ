import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ActivityLogPayload {
  subject_user_id: string;
  verb: string;
  object_type: string;
  object_id?: string;
  visibility?: 'public' | 'followers' | 'friends' | 'private' | 'custom';
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

    const { subject_user_id, verb, object_type, object_id, visibility }: ActivityLogPayload = await req.json();

    if (!subject_user_id || !verb || !object_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's privacy rules for this scope
    const { data: privacyRule } = await supabaseClient
      .from("privacy_rules")
      .select("rule")
      .eq("owner_id", subject_user_id)
      .eq("scope", "activity")
      .single();

    const effectiveVisibility = visibility || privacyRule?.rule || 'followers';

    // Insert activity
    const { error: activityError } = await supabaseClient
      .from("activity_feed")
      .insert({
        actor_id: user.id,
        subject_user_id,
        verb,
        object_type,
        object_id,
        visibility: effectiveVisibility,
      });

    if (activityError) {
      console.error("Error logging activity:", activityError);
      
      // Log error
      await supabaseClient.from("app_events").insert({
        user_id: user.id,
        event: "activity_log_error",
        meta: { verb, object_type, error: activityError.message },
      });

      return new Response(
        JSON.stringify({ error: "Failed to log activity" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log success
    await supabaseClient.from("app_events").insert({
      user_id: user.id,
      event: "activity_log_success",
      meta: { verb, object_type, visibility: effectiveVisibility },
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Activity log error:", error);
    
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});