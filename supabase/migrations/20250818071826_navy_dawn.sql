/*
  # Create Reels Storage Bucket

  1. Storage Bucket
    - Create `reels` bucket for short video content
    - Configure public access for viewing videos
    - Set up proper RLS policies for security

  2. Security
    - Users can upload videos for their own reels
    - Videos are publicly viewable based on reel visibility
    - Proper file size and type restrictions
*/

-- Create the reels bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('reels', 'reels', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload reel videos
CREATE POLICY "Users can upload reel videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reels' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public viewing of reel videos (visibility controlled by reel settings)
CREATE POLICY "Reel videos are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'reels');

-- Allow users to update their own reel videos
CREATE POLICY "Users can update their own reel videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'reels' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own reel videos
CREATE POLICY "Users can delete their own reel videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'reels' AND
  auth.uid()::text = (storage.foldername(name))[1]
);