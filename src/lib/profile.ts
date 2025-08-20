// src/lib/profile.ts
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";

export type Profile = {
  id: string;
  // add any optional columns you actually have:
  // username?: string | null;
  // full_name?: string | null;
  // avatar_url?: string | null;
};

export async function getProfile(userId: string) {
  // Returns { data: null, error: null } if it doesn’t exist yet.
  return supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
}

export async function ensureProfile(userId: string) {
  // 1) Try to find it
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (error && (error as any).code !== "PGRST116") throw error;
  if (data) return data; // already exists

  // 2) Create it if missing (handle unique conflict 23505 safely)
  const { error: insertErr } = await supabase
    .from("profiles")
    .insert({ id: userId })
    .single();

  if (insertErr && insertErr.code !== "23505") throw insertErr;
  return { id: userId };
}

/** Call this once (e.g. in App) so the user’s profile is created on sign-in. */
export function useEnsureProfile() {
  useEffect(() => {
    let active = true;

    // On initial load
    supabase.auth.getUser().then(({ data, error }) => {
      const user = data?.user;
      if (!error && active && user) ensureProfile(user.id);
    });

    // On future auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((evt, session) => {
      if (evt === "SIGNED_IN" && session?.user) {
        ensureProfile(session.user.id);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);
}
