import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SymptomAnalysisPayload {
  pet_id: string;
  pet_name: string;
  pet_species: string;
  symptoms: string[];
  duration: string;
  severity: 'mild' | 'moderate' | 'severe';
  appetite: string;
  energy: string;
  behavior_changes?: string;
  additional_notes?: string;
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

    const payload: SymptomAnalysisPayload = await req.json();

    if (!payload.pet_id || !payload.symptoms || payload.symptoms.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify pet ownership
    const { data: pet, error: petError } = await supabaseClient
      .from("pets")
      .select("owner_id")
      .eq("id", payload.pet_id)
      .single();

    if (petError || !pet || pet.owner_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Pet not found or unauthorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if OpenAI API key is available
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      // Return a mock analysis if no API key
      const mockAnalysis = {
        analysis_type: "mock",
        urgency_level: payload.severity === "severe" ? "high" : payload.severity === "moderate" ? "medium" : "low",
        recommendations: [
          "Monitor your pet closely for any changes",
          "Ensure your pet stays hydrated",
          "Contact your veterinarian if symptoms worsen",
          "Keep a log of symptoms and their frequency"
        ],
        when_to_see_vet: payload.severity === "severe" 
          ? "Seek immediate veterinary attention"
          : payload.severity === "moderate"
          ? "Schedule a veterinary appointment within 24-48 hours"
          : "Monitor for 24-48 hours, contact vet if symptoms persist or worsen",
        disclaimer: "This is a mock analysis for demonstration purposes. Always consult with a qualified veterinarian for proper diagnosis and treatment.",
        generated_at: new Date().toISOString()
      };

      return new Response(
        JSON.stringify(mockAnalysis),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare prompt for OpenAI
    const prompt = `As a veterinary AI assistant, analyze the following symptoms for a ${payload.pet_species} named ${payload.pet_name}:

Symptoms: ${payload.symptoms.join(", ")}
Duration: ${payload.duration}
Severity: ${payload.severity}
Appetite: ${payload.appetite}
Energy Level: ${payload.energy}
${payload.behavior_changes ? `Behavior Changes: ${payload.behavior_changes}` : ''}
${payload.additional_notes ? `Additional Notes: ${payload.additional_notes}` : ''}

Please provide:
1. Urgency level (low/medium/high)
2. Possible causes (list 3-5 most likely)
3. Immediate care recommendations
4. When to see a veterinarian
5. Warning signs to watch for

Format as JSON with keys: urgency_level, possible_causes, recommendations, when_to_see_vet, warning_signs.

Remember: This is preliminary guidance only. Always recommend professional veterinary consultation for proper diagnosis.`;

    // Call OpenAI API
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful veterinary AI assistant. Provide preliminary symptom analysis while always emphasizing the need for professional veterinary care."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const analysisText = openaiData.choices[0]?.message?.content;

    if (!analysisText) {
      throw new Error("No analysis received from OpenAI");
    }

    // Parse JSON response
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (error) {
      // If JSON parsing fails, create structured response
      analysis = {
        urgency_level: payload.severity === "severe" ? "high" : payload.severity === "moderate" ? "medium" : "low",
        analysis_text: analysisText,
        recommendations: ["Consult with your veterinarian for proper diagnosis"],
        when_to_see_vet: "Schedule a veterinary appointment to discuss these symptoms"
      };
    }

    // Add metadata
    analysis.analysis_type = "ai_generated";
    analysis.generated_at = new Date().toISOString();
    analysis.disclaimer = "This AI analysis is for informational purposes only. Always consult with a qualified veterinarian for proper diagnosis and treatment.";

    // Log the analysis
    await supabaseClient.from("app_events").insert({
      user_id: user.id,
      event: "symptom_analysis_completed",
      meta: {
        pet_id: payload.pet_id,
        symptoms_count: payload.symptoms.length,
        severity: payload.severity,
        urgency_level: analysis.urgency_level
      },
    });

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Symptom analysis error:", error);
    
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});