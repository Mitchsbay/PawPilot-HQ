import type { SupabaseClient } from '@supabase/supabase-js';
import { firstRow } from './firstRow';

export async function getMyGroupRole(
  sb: SupabaseClient,
  groupId: string,
  userId: string
): Promise<{ role: string | null; error: Error | null }> {
  const { data, error } = await sb
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .limit(1);
  if (error) return { role: null, error };
  const row = firstRow(data);
  return { role: row?.role ?? null, error: null };
}

export async function isInThread(
  sb: SupabaseClient,
  threadId: string,
  userId: string
): Promise<{ inThread: boolean; error: Error | null }> {
  const { data, error } = await sb
    .from('thread_participants')
    .select('user_id')
    .eq('thread_id', threadId)
    .eq('user_id', userId)
    .limit(1);
  if (error) return { inThread: false, error };
  const row = firstRow(data);
  return { inThread: !!row, error: null };
}

export async function getMyEventRSVP(
  sb: SupabaseClient,
  eventId: string,
  userId: string
): Promise<{ status: string | null; error: Error | null }> {
  const { data, error } = await sb
    .from('event_rsvps')
    .select('status')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .limit(1);
  if (error) return { status: null, error };
  const row = firstRow(data);
  return { status: row?.status ?? null, error: null };
}

export async function isFollowing(
  sb: SupabaseClient,
  followerId: string,
  followingId: string
): Promise<{ following: boolean; error: Error | null }> {
  const { data, error } = await sb
    .from('user_follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .limit(1);
  if (error) return { following: false, error };
  const row = firstRow(data);
  return { following: !!row, error: null };
}

export async function hasLikedPost(
  sb: SupabaseClient,
  postId: string,
  userId: string
): Promise<{ liked: boolean; error: Error | null }> {
  const { data, error } = await sb
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .limit(1);
  if (error) return { liked: false, error };
  const row = firstRow(data);
  return { liked: !!row, error: null };
}

export async function hasSavedPost(
  sb: SupabaseClient,
  postId: string,
  userId: string
): Promise<{ saved: boolean; error: Error | null }> {
  const { data, error } = await sb
    .from('saved_posts')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .limit(1);
  if (error) return { saved: false, error };
  const row = firstRow(data);
  return { saved: !!row, error: null };
}
