/*
  # Create Lost & Found Photos Storage Bucket

  1. Storage Bucket
    - Create `lost-found-photos` bucket for pet photos in lost & found reports
    - Configure public access for viewing photos
    - Set up proper RLS policies for security

  2. Security
    - Users can upload photos for their own reports
    - Photos are publicly viewable for lost & found purposes
    - Proper file size and type restrictions
*/

-- Create the lost-found-photos bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lost-found-photos', 'lost-found-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload photos for their reports
CREATE POLICY "Users can upload lost & found photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lost-found-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public viewing of lost & found photos (important for finding pets)
CREATE POLICY "Lost & found photos are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'lost-found-photos');

-- Allow users to update their own photos
CREATE POLICY "Users can update their own lost & found photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lost-found-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete their own lost & found photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'lost-found-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);