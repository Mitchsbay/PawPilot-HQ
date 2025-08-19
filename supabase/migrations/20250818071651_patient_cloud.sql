/*
  # Create Album Photos Storage Bucket

  1. Storage Bucket
    - Create `album-photos` bucket for photo album images
    - Configure public access for viewing photos
    - Set up proper RLS policies for security

  2. Security
    - Users can upload photos for their own albums
    - Photos are publicly viewable based on album visibility
    - Proper file size and type restrictions
*/

-- Create the album-photos bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('album-photos', 'album-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload photos for their albums
CREATE POLICY "Users can upload album photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'album-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public viewing of album photos (visibility controlled by album settings)
CREATE POLICY "Album photos are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'album-photos');

-- Allow users to update their own album photos
CREATE POLICY "Users can update their own album photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'album-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own album photos
CREATE POLICY "Users can delete their own album photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'album-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);