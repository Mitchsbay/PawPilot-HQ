import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { supabase } from "../lib/supabase";
import { BUCKETS, type BucketKey } from "../lib/buckets";
import { telemetry } from "../lib/telemetry";
import { autoClassify } from "../features/ai/autoTag";

export interface CaptureOptions {
  bucket: BucketKey;
  quality?: number;
  source?: 'camera' | 'gallery';
  allowEditing?: boolean;
}

export interface CaptureResult {
  bucket: string;
  path: string;
  userId: string;
  publicUrl: string;
  aiLabels?: Array<{label: string, score: number}>;
}

export async function captureTo(options: CaptureOptions): Promise<CaptureResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if running on mobile platform
    if (!Capacitor.isNativePlatform()) {
      throw new Error('Camera capture only available on mobile devices');
    }

    await telemetry.mobile.cameraCapture({ 
      bucket: options.bucket,
      source: options.source || 'camera'
    });

    // Configure camera options
    const cameraOptions = {
      quality: options.quality || 85,
      allowEditing: options.allowEditing || false,
      resultType: CameraResultType.Uri,
      source: options.source === 'gallery' ? CameraSource.Photos : CameraSource.Camera,
      saveToGallery: true
    };

    // Capture photo
    const photo: Photo = await Camera.getPhoto(cameraOptions);
    
    if (!photo.webPath) {
      throw new Error('Failed to capture photo');
    }

    // Convert to blob
    const response = await fetch(photo.webPath);
    const blob = await response.blob();

    // Generate unique filename
    const timestamp = Date.now();
    const extension = photo.format === 'jpeg' ? 'jpg' : photo.format || 'jpg';
    const filename = `${timestamp}_capture.${extension}`;
    const path = `${user.id}/${filename}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKETS[options.bucket])
      .upload(path, blob, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Failed to upload photo');
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKETS[options.bucket])
      .getPublicUrl(uploadData.path);

    const result: CaptureResult = {
      bucket: BUCKETS[options.bucket],
      path: uploadData.path,
      userId: user.id,
      publicUrl
    };

    // Trigger AI classification if enabled
    try {
      await autoClassify(user.id, BUCKETS[options.bucket], uploadData.path);
    } catch (aiError) {
      console.warn('AI classification failed:', aiError);
      // Don't fail the whole operation if AI fails
    }

    await telemetry.mobile.cameraCapture({ 
      success: true,
      bucket: options.bucket,
      file_size: blob.size
    });

    return result;
  } catch (error) {
    console.error('Error capturing photo:', error);
    
    await telemetry.mobile.cameraCapture({ 
      success: false,
      bucket: options.bucket,
      error: error.message
    });
    
    throw error;
  }
}

export async function selectFromGallery(options: Omit<CaptureOptions, 'source'>): Promise<CaptureResult> {
  return captureTo({ ...options, source: 'gallery' });
}

export async function captureWithCamera(options: Omit<CaptureOptions, 'source'>): Promise<CaptureResult> {
  return captureTo({ ...options, source: 'camera' });
}

export async function checkCameraPermissions(): Promise<boolean> {
  try {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    const permissions = await Camera.checkPermissions();
    return permissions.camera === 'granted';
  } catch (error) {
    console.error('Error checking camera permissions:', error);
    return false;
  }
}

export async function requestCameraPermissions(): Promise<boolean> {
  try {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    const permissions = await Camera.requestPermissions();
    return permissions.camera === 'granted';
  } catch (error) {
    console.error('Error requesting camera permissions:', error);
    return false;
  }
}