import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PrivacyResolvePayload {
  owner_id: string;
  scope: string;
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

    const { owner_id, scope }: PrivacyResolvePayload = await req.json();

    if (!owner_id || !scope) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If viewing own content, always allow
    if (owner_id === user.id) {
      return new Response(
        JSON.stringify({ allowed: true, rule: 'owner' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get privacy rule for scope
    const { data: privacyRule } = await supabaseClient
      .from("privacy_rules")
      .select("id, rule")
      .eq("owner_id", owner_id)
      .eq("scope", scope)
      .single();

    const rule = privacyRule?.rule || 'public';

    // Check for specific override
    if (privacyRule) {
      const { data: override } = await supabaseClient
        .from("privacy_rule_overrides")
        .select("allow")
        .eq("rule_id", privacyRule.id)
        .eq("target_user_id", user.id)
        .single();

      if (override) {
        return new Response(
          JSON.stringify({ allowed: override.allow, rule: 'override' }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Apply rule logic
    let allowed = false;
    
    switch (rule) {
      case 'public':
        allowed = true;
        break;
      case 'followers':
        const { data: follower } = await supabaseClient
          .from("user_follows")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", owner_id)
          .single();
        allowed = !!follower;
        break;
      case 'friends':
        const { data: friendship } = await supabaseClient
          .from("user_follows")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", owner_id);
        const { data: reverseFriendship } = await supabaseClient
          .from("user_follows")
          .select("id")
          .eq("follower_id", owner_id)
          .eq("following_id", user.id);
        allowed = !!(friendship && friendship.length > 0 && reverseFriendship && reverseFriendship.length > 0);
        break;
      case 'private':
        allowed = false;
        break;
      default:
        allowed = false;
    }

    return new Response(
      JSON.stringify({ allowed, rule }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Privacy resolve error:", error);
    
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});