// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { BUCKETS, type BucketKey } from './buckets';

/** ---- Env & Client ------------------------------------------------------- */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (
  !supabaseUrl ||
  !supabaseKey ||
  supabaseUrl.includes('YOUR_PROJECT') ||
  supabaseKey.includes('YOUR_ANON_KEY')
) {
  throw new Error(
    'Missing or invalid Supabase environment variables. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env.[local] file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  // supabase-js sends apikey automatically; we also include it globally so any
  // internal fetches from the client carry it (belt-and-suspenders).
  global: {
    headers: { apikey: supabaseKey },
  },
});

/** ---- Direct PostgREST helper (optional) ---------------------------------
 * If you *must* call PostgREST directly, use this instead of raw fetch.
 * It always includes the `apikey` header and, when available, the user JWT.
 */
export async function pgFetch(path: string, init?: RequestInit) {
  const jwt = (await supabase.auth.getSession()).data.session?.access_token;
  const url = `${supabaseUrl}/rest/v1/${path}`;
  return fetch(url, {
    ...init,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${jwt ?? supabaseKey}`,
      ...(init?.headers || {}),
    },
  });
}

/** ---- App Types ---------------------------------------------------------- */
export interface Profile {
  id: string;
  email: string;
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  role: 'user' | 'admin' | 'super_admin';
  profile_visibility: 'public' | 'friends' | 'private';
  default_post_visibility: 'public' | 'friends' | 'private';
  allow_messages_from: 'public' | 'friends' | 'private';
  allow_tagging?: boolean;
  allow_mentions?: boolean;
  show_online_status?: boolean;
  notify_likes?: boolean;
  notify_comments?: boolean;
  notify_messages?: boolean;
  notify_follows?: boolean;
  notify_events?: boolean;
  notify_lost_found?: boolean;
  lost_found_contact_email?: boolean;
  lost_found_contact_phone?: boolean;
  created_at: string;
}

export interface Pet {
  id: string;
  owner_id: string;
  name: string;
  species:
    | 'dog'
    | 'cat'
    | 'bird'
    | 'rabbit'
    | 'hamster'
    | 'fish'
    | 'reptile'
    | 'other';
  breed?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  weight?: number | null;
  color?: string | null;
  photo_url?: string | null;
  bio?: string | null;
  visibility: 'public' | 'friends' | 'private';
  is_lost: boolean;
  created_at: string;
}

export interface Post {
  id: string;
  author_id: string;
  content: string;
  media_urls: string[];
  visibility: 'public' | 'friends' | 'private';
  group_id?: string | null;
  pet_id?: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  profiles?: Profile;
  pets?: Pet;
}

export interface HealthRecord {
  id: string;
  pet_id: string;
  type:
    | 'checkup'
    | 'vaccination'
    | 'medication'
    | 'surgery'
    | 'emergency'
    | 'symptom'
    | 'other';
  title: string;
  description?: string | null;
  date: string;
  veterinarian?: string | null;
  cost?: number | null;
  attachment_url?: string | null;
  symptom_analysis?: any;
  created_at: string;
}

export interface LostFound {
  id: string;
  reporter_id: string;
  status: 'lost' | 'found' | 'resolved';
  pet_name: string;
  species: string;
  breed?: string | null;
  description: string;
  photo_url?: string | null;
  last_seen_location: string;
  latitude: number;
  longitude: number;
  contact_phone?: string | null;
  contact_email?: string | null;
  reward_offered: boolean;
  reward_amount?: number | null;
  is_resolved: boolean;
  created_at: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

export interface UserPresence {
  user_id: string;
  last_seen_at: string;
  status: 'online' | 'away' | 'offline';
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export interface ActivityFeedItem {
  id: string;
  actor_id: string;
  subject_user_id: string;
  verb: string;
  object_type: string;
  object_id?: string | null;
  visibility: 'public' | 'followers' | 'friends' | 'private' | 'custom';
  created_at: string;
  actor_profile?: Profile;
}

export interface PrivacyRule {
  id: string;
  owner_id: string;
  scope: string;
  rule: string;
  created_at: string;
}

export interface PrivacyRuleOverride {
  id: string;
  rule_id: string;
  target_user_id: string;
  allow: boolean;
}

export interface AppEvent {
  id: number;
  user_id?: string | null;
  event: string;
  meta?: Record<string, any>;
  occurred_at: string;
}

/** ---- Auth convenience helpers ------------------------------------------ */
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
};

export const getCurrentProfile = async () => {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('getCurrentProfile error:', error);
    return null;
  }
  return data ?? null;
};

/** ---- Storage helpers ---------------------------------------------------- */
export const uploadFile = async (
  bucketKey: BucketKey,
  filename: string,
  file: File
): Promise<string | null> => {
  const user = await getCurrentUser();
  if (!user) {
    console.error('User not authenticated for file upload');
    return null;
  }

  // Path-based ownership: userId/filename
  const safePath = `${user.id}/${filename}`;
  const bucket = BUCKETS[bucketKey];

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(safePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return pub.publicUrl ?? null;
};

export const deleteFile = async (bucketKey: BucketKey, path: string) => {
  const bucket = BUCKETS[bucketKey];
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) console.error('Delete error:', error);
};

/** ---- Realtime helpers --------------------------------------------------- */
export const subscribeToPresence = (channel: string, callback: (payload: any) => void) => {
  const presence = supabase
    .channel(channel)
    .on('presence', { event: '*' }, callback)
    .subscribe();

  return presence;
};

export const subscribeToMessages = (threadId: string, callback: (payload: any) => void) => {
  const subscription = supabase
    .channel(`messages:${threadId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `thread_id=eq.${threadId}`,
    }, callback)
    .subscribe();

  return subscription;
};
