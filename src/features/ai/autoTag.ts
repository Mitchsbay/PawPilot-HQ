import { isEnabled } from "../../lib/flags";
import { supabase } from "../../lib/supabase";
import { telemetry } from "../../lib/telemetry";

export interface AILabel {
  label: string;
  score: number;
  category?: 'pet' | 'breed' | 'activity' | 'location' | 'object';
}

export interface AutoTagResult {
  labels: AILabel[];
  suggestedTags: string[];
  petBreedDetected?: string;
  confidenceScore: number;
}

export async function autoClassify(
  userId: string, 
  bucket: string, 
  path: string
): Promise<AutoTagResult | null> {
  try {
    // Check if AI auto-tagging is enabled for this user
    const enabled = await isEnabled("ai_autotag", userId);
    if (!enabled) {
      console.log('AI auto-tagging not enabled for user:', userId);
      return null;
    }

    await telemetry.ai.classify({ 
      bucket, 
      path, 
      user_id: userId 
    });

    // Call the classify-media edge function
    const { data, error } = await supabase.functions.invoke('classify-media', {
      body: {
        user_id: userId,
        bucket,
        path,
        media_type: getMediaTypeFromBucket(bucket)
      }
    });

    if (error) {
      console.error('Error calling classify-media function:', error);
      await telemetry.ai.classify({ 
        success: false,
        error: error.message,
        bucket, 
        path 
      });
      return null;
    }

    const labels: AILabel[] = data.labels || [];
    
    // Process labels to generate suggestions
    const result = processAILabels(labels);

    await telemetry.ai.classify({ 
      success: true,
      labels_count: labels.length,
      confidence_score: result.confidenceScore,
      bucket, 
      path 
    });

    return result;
  } catch (error) {
    console.error('Error in auto-classify:', error);
    
    await telemetry.ai.classify({ 
      success: false,
      error: error.message,
      bucket, 
      path 
    });
    
    return null;
  }
}

export async function autoTagPost(
  postId: string,
  mediaUrls: string[]
): Promise<string[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const enabled = await isEnabled("ai_autotag", user.id);
    if (!enabled) return [];

    const allSuggestedTags: string[] = [];

    // Process each media URL
    for (const url of mediaUrls) {
      try {
        // Extract bucket and path from URL
        const { bucket, path } = extractBucketAndPath(url);
        if (!bucket || !path) continue;

        const result = await autoClassify(user.id, bucket, path);
        if (result) {
          allSuggestedTags.push(...result.suggestedTags);
        }
      } catch (error) {
        console.warn('Failed to classify media URL:', url, error);
      }
    }

    // Remove duplicates and return top suggestions
    const uniqueTags = [...new Set(allSuggestedTags)];
    
    await telemetry.ai.autoTag({ 
      post_id: postId,
      media_count: mediaUrls.length,
      tags_suggested: uniqueTags.length
    });

    return uniqueTags.slice(0, 5); // Return top 5 suggestions
  } catch (error) {
    console.error('Error auto-tagging post:', error);
    return [];
  }
}

export async function suggestPetBreed(
  petId: string,
  photoUrl: string
): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const enabled = await isEnabled("ai_autotag", user.id);
    if (!enabled) return null;

    const { bucket, path } = extractBucketAndPath(photoUrl);
    if (!bucket || !path) return null;

    const result = await autoClassify(user.id, bucket, path);
    if (!result) return null;

    // Look for breed-specific labels
    const breedLabels = result.labels.filter(label => 
      label.category === 'breed' && label.score > 0.7
    );

    if (breedLabels.length > 0) {
      const topBreed = breedLabels[0];
      
      await telemetry.ai.autoTag({ 
        pet_id: petId,
        breed_detected: topBreed.label,
        confidence: topBreed.score
      });

      return topBreed.label;
    }

    return null;
  } catch (error) {
    console.error('Error suggesting pet breed:', error);
    return null;
  }
}

function getMediaTypeFromBucket(bucket: string): 'image' | 'video' {
  if (bucket.includes('video') || bucket.includes('reel')) {
    return 'video';
  }
  return 'image';
}

function processAILabels(labels: AILabel[]): AutoTagResult {
  // Calculate overall confidence
  const confidenceScore = labels.length > 0 
    ? labels.reduce((sum, label) => sum + label.score, 0) / labels.length
    : 0;

  // Generate suggested tags from high-confidence labels
  const suggestedTags = labels
    .filter(label => label.score > 0.6)
    .map(label => label.label)
    .slice(0, 8);

  // Detect pet breed from labels
  const breedLabel = labels.find(label => 
    label.category === 'breed' && label.score > 0.7
  );

  return {
    labels,
    suggestedTags,
    petBreedDetected: breedLabel?.label,
    confidenceScore: Math.round(confidenceScore * 100) / 100
  };
}

function extractBucketAndPath(url: string): { bucket: string; path: string } | { bucket: null; path: null } {
  try {
    // Extract bucket and path from Supabase storage URL
    // Format: https://project.supabase.co/storage/v1/object/public/bucket/path
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    if (pathParts.length >= 6 && pathParts[1] === 'storage' && pathParts[4] === 'public') {
      const bucket = pathParts[5];
      const path = pathParts.slice(6).join('/');
      return { bucket, path };
    }

    return { bucket: null, path: null };
  } catch (error) {
    console.error('Error extracting bucket and path from URL:', url, error);
    return { bucket: null, path: null };
  }
}