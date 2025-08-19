import { supabase } from './supabase';
import { BUCKETS, LEGACY_BUCKETS, type BucketKey } from './buckets';

/**
 * Get public URL with fallback to legacy bucket if file not found
 * Useful for reading old files that may still be in hyphen buckets
 */
export async function publicUrlWithFallback<K extends BucketKey>(
  bucketKey: K, 
  path: string
): Promise<string> {
  const bucket = BUCKETS[bucketKey];
  
  // Try primary bucket first
  const primary = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  
  // Check if file exists in primary bucket
  const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
  const filename = path.split('/').pop()!;
  
  try {
    const { data: list } = await supabase.storage.from(bucket).list(dir);
    if (list?.some(f => f.name === filename)) {
      return primary;
    }
  } catch (error) {
    console.warn('Error checking primary bucket:', error);
  }
  
  // Fallback to legacy bucket if available
  const legacyBucket = (LEGACY_BUCKETS as any)[bucketKey];
  if (legacyBucket) {
    return supabase.storage.from(legacyBucket).getPublicUrl(path).data.publicUrl;
  }
  
  return primary;
}

/**
 * Upload file with enforced path-based ownership
 */
export async function uploadFileSecure(
  bucketKey: BucketKey,
  filename: string,
  file: File,
  options?: { upsert?: boolean }
): Promise<string | null> {
  const user = await supabase.auth.getUser();
  if (!user.data.user) {
    console.error('User not authenticated for file upload');
    return null;
  }

  // Enforce path-based ownership
  const safePath = `${user.data.user.id}/${filename}`;
  const bucket = BUCKETS[bucketKey];

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(safePath, file, {
      cacheControl: '3600',
      upsert: options?.upsert || false
    });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrl;
}