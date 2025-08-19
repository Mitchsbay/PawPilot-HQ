import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ClassifyMediaPayload {
  user_id: string;
  bucket: string;
  path: string;
  media_type?: 'image' | 'video';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization")!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { user_id, bucket, path, media_type = 'image' }: ClassifyMediaPayload = await req.json();

    if (!user_id || !bucket || !path) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user owns the file (path should start with user_id)
    if (!path.startsWith(`${user_id}/`)) {
      return new Response(
        JSON.stringify({ error: "Unauthorized file access" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get file URL for analysis
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    // Mock AI classification (replace with actual AI service)
    const mockLabels = generateMockLabels(media_type, path);

    // In production, you would call an actual AI service like:
    // const response = await fetch('https://api.openai.com/v1/images/generations', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     model: 'gpt-4-vision-preview',
    //     messages: [{
    //       role: 'user',
    //       content: [{
    //         type: 'image_url',
    //         image_url: { url: publicUrl }
    //       }, {
    //         type: 'text',
    //         text: 'Identify the pets and objects in this image. Return as JSON with labels and confidence scores.'
    //       }]
    //     }]
    //   })
    // });

    // Save AI prediction
    const { error: insertError } = await supabase
      .from("ai_predictions")
      .insert({
        user_id,
        subject_type: media_type === 'image' ? 'photo' : 'post_media',
        subject_bucket: bucket,
        subject_path: path,
        model: "mock-classifier-v1",
        labels: mockLabels
      });

    if (insertError) {
      console.error("Error saving AI prediction:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save prediction" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log classification event
    await supabase.from("event_log").insert({
      user_id,
      name: "ai_media_classified",
      props: {
        bucket,
        path,
        media_type,
        labels_count: mockLabels.length
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        labels: mockLabels,
        model: "mock-classifier-v1"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Media classification error:", error);
    
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateMockLabels(mediaType: string, path: string): Array<{label: string, score: number}> {
  const petLabels = [
    { label: "dog", score: 0.95 },
    { label: "golden_retriever", score: 0.87 },
    { label: "outdoor", score: 0.82 },
    { label: "happy", score: 0.78 }
  ];

  const catLabels = [
    { label: "cat", score: 0.93 },
    { label: "tabby", score: 0.85 },
    { label: "indoor", score: 0.79 },
    { label: "sleeping", score: 0.72 }
  ];

  const generalLabels = [
    { label: "pet", score: 0.89 },
    { label: "animal", score: 0.95 },
    { label: "cute", score: 0.84 }
  ];

  // Simple heuristic based on filename
  const filename = path.toLowerCase();
  if (filename.includes('dog') || filename.includes('puppy')) {
    return petLabels;
  } else if (filename.includes('cat') || filename.includes('kitten')) {
    return catLabels;
  } else {
    return generalLabels;
  }
}