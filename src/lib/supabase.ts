import { supabase } from './supabase';
import { firstRow } from './firstRow';

/**
 * Safe wrapper for feature flag queries that never break the UI
 * Falls back to disabled (false) if database errors occur
 */
export async function getFeatureFlagSafe(key: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('is_enabled')
      .eq('key', key)
      .limit(1);

    if (error) {
      console.warn(`[flags] Database error for ${key}:`, error.message);
      return false;
    }
    
    const flag = firstRow(data);
    return Boolean(flag?.is_enabled);
  } catch (error) {
    // Fail CLOSED (disabled) so UI still renders
    console.warn(`[flags] Falling back: ${key}=false due to error:`, error);
    return false;
  }
}

/**
 * Safe wrapper for achievements queries that never break the UI
 * Falls back to empty array if database errors occur
 */
export async function getAchievementsSafe(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .order('points', { ascending: true });

    if (error) {
      console.warn('[achievements] Database error:', error.message);
      return [];
    }
    
    return data ?? [];
  } catch (error) {
    console.warn('[achievements] Falling back to empty list due to error:', error);
    return [];
  }
}

/**
 * Safe wrapper for getting all feature flags
 * Returns empty object if database errors occur
 */
export async function getAllFeatureFlagsSafe(): Promise<Record<string, boolean>> {
  try {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('key, is_enabled');

    if (error) {
      console.warn('[flags] Database error loading all flags:', error.message);
      return {};
    }

    const flags: Record<string, boolean> = {};
    (data || []).forEach(flag => {
      flags[flag.key] = flag.is_enabled;
    });

    return flags;
  } catch (error) {
    console.warn('[flags] Falling back to empty flags due to error:', error);
    return {};
  }
}
