import { supabase } from "@/lib/supabase"; // if the @ alias doesn't work, use: ../lib/supabase

export async function loadOrCreateProfile() {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) throw userErr ?? new Error("No user session");

  const userId = user.id;

  // Try to read; returns null if not found
  const { data: profile, error: selErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (selErr && selErr.code !== "PGRST116") {
    throw selErr; // real error (e.g., RLS)
  }

  if (profile) return profile;

  // Create if missing
  const { data: created, error: insErr } = await supabase
    .from("profiles")
    .insert({ id: userId }) // add required defaults if your schema needs them
    .select()
    .single();

  if (insErr) throw insErr;
  return created;
}
