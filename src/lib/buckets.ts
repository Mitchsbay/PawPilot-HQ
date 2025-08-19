export const BUCKETS = {
  avatars: 'avatars',
  petPhotos: 'pet_photos',
  postMedia: 'post_media', 
  groupAvatars: 'group_avatars',
  albumPhotos: 'album_photos',
  lostFoundPhotos: 'lost_found_photos',
  reelVideos: 'reel_videos',
  causeImages: 'cause_images',
  healthAttachments: 'health_attachments', // private
} as const;

export const LEGACY_BUCKETS = {
  petPhotos: 'pet-photos',
  postMedia: 'post-media',
  groupAvatars: 'group-avatars',
  albumPhotos: 'album-photos',
  lostFoundPhotos: 'lost-found-photos',
  reelVideos: 'reel-videos',
  causeImages: 'cause-images',
  healthAttachments: 'health-attachments',
} as const;

export type BucketKey = keyof typeof BUCKETS;
export type BucketName = typeof BUCKETS[BucketKey];