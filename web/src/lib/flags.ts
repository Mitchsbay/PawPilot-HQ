import { supabase } from "../lib/supabase";

const cache = new Map<string, boolean>();

export async function isEnabled(key: string, uid?: string): Promise<boolean> {
  if (cache.has(key)) return cache.get(key)!;
  
  try {
    const { data } = await supabase
      .from("feature_flags")
      .select("*")
      .eq("key", key)
      .single();

    if (!data) return false;

    let enabled = !!data.is_enabled;

    // Role-based rollout
    if (uid && Array.isArray(data.rollout?.roles)) {
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .single();

      if (userRole && data.rollout.roles.includes(userRole.role)) {
        enabled = true;
      }
    }

    // Percentage-based rollout
    if (uid && typeof data.rollout?.pct === "number") {
      const hash = [...uid].reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
      if (Math.abs(hash) % 100 < data.rollout.pct) {
        enabled = true;
      }
    }

    cache.set(key, enabled);
    return enabled;
  } catch (error) {
    console.error("Error checking feature flag:", error);
    return false;
  }
}

export async function getAllFlags(): Promise<Record<string, boolean>> {
  try {
    const { data } = await supabase
      .from("feature_flags")
      .select("key, is_enabled");

    const flags: Record<string, boolean> = {};
    (data || []).forEach(flag => {
      flags[flag.key] = flag.is_enabled;
    });

    return flags;
  } catch (error) {
    console.error("Error loading feature flags:", error);
    return {};
  }
}

export async function updateFlag(key: string, enabled: boolean, rollout?: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("feature_flags")
      .upsert({
        key,
        is_enabled: enabled,
        rollout: rollout || {},
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error("Error updating feature flag:", error);
      return false;
    }

    // Clear cache
    cache.delete(key);
    return true;
  } catch (error) {
    console.error("Error updating feature flag:", error);
    return false;
  }
}

// Predefined feature flags
export const FEATURE_FLAGS = {
  PAYMENTS_BILLING: 'payments_billing',
  DONATIONS_CHECKOUT: 'donations_checkout',
  OFFLINE_MODE: 'offline_mode',
  AI_AUTOTAG: 'ai_autotag',
  GAMIFICATION_V1: 'gamification_v1',
  MOBILE_CAMERA: 'mobile_camera',
  MOBILE_GPS: 'mobile_gps',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  LIVE_STREAMING: 'live_streaming',
  SOCIAL_SHARING: 'social_sharing'
} as const;