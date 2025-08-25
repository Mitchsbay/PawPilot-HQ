import { createClient } from '@supabase/supabase-js';
import { BUCKETS, type BucketKey } from './buckets';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || 
    supabaseUrl.includes('YOUR_PROJECT') || 
    supabaseKey.includes('YOUR_ANON_KEY')) {
  throw new Error(
    'Missing or invalid Supabase environment variables. Please check your .env.local file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set with your actual Supabase project credentials.'
  );
}

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set with your actual Supabase project credentials.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      apikey: supabaseKey, // belt-and-suspenders; supabase-js adds this too
    },
  },
});

// Optional: a tiny helper when you really must call PostgREST directly.
// Always use this instead of raw fetch to avoid "No API key found".
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

// Types
export interface Profile {
  id: string;
  email: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  role: 'user' | 'admin' | 'super_admin';
  profile_visibility: 'public' | 'friends' | 'private';
  default_post_visibility: 'public' | 'friends' | 'private';
  allow_messages_from: 'public' | 'friends' | 'private';
  created_at: string;
}

export interface Pet {
  id: string;
  owner_id: string;
  name: string;
  species: 'dog' | 'cat' | 'bird' | 'rabbit' | 'hamster' | 'fish' | 'reptile' | 'other';
  breed?: string;
  date_of_birth?: string;
  gender?: string;
  weight?: number;
  color?: string;
  photo_url?: string;
  bio?: string;
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
  group_id?: string;
  pet_id?: string;
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
  type: 'checkup' | 'vaccination' | 'medication' | 'surgery' | 'emergency' | 'symptom' | 'other';
  title: string;
  description?: string;
  date: string;
  veterinarian?: string;
  cost?: number;
  attachment_url?: string;
  symptom_analysis?: any;
  created_at: string;
}

export interface LostFound {
  id: string;
  reporter_id: string;
  status: 'lost' | 'found' | 'resolved';
  pet_name: string;
  species: string;
  breed?: string;
  description: string;
  photo_url?: string;
  last_seen_location: string;
  latitude: number;
  longitude: number;
  contact_phone?: string;
  contact_email?: string;
  reward_offered: boolean;
  reward_amount?: number;
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
  object_id?: string;
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
  user_id?: string;
  event: string;
  meta?: Record<string, any>;
  occurred_at: string;
}

// Auth helpers
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getCurrentProfile = async () => {
  const user = await getCurrentUser();
  if (!user) return null;
  
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .limit(1);
    
  return data?.[0] || null;
};

// Storage helpers
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

  // Enforce path-based ownership: userId/filename
  const safePath = `${user.id}/${filename}`;
  const bucket = BUCKETS[bucketKey];

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(safePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrl;
};

export const deleteFile = async (bucketKey: BucketKey, path: string) => {
  const bucket = BUCKETS[bucketKey];
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    console.error('Delete error:', error);
  }
};

// Realtime helpers
export const subscribeToPresence = (channel: string, callback: (payload: any) => void) => {
  const presence = supabase.channel(channel)
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
      filter: `thread_id=eq.${threadId}`
    }, callback)
    .subscribe();
    
  return subscription;
};
