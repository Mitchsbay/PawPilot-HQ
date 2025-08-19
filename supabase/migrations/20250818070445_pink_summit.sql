/*
  # Create post media storage bucket

  1. Storage
    - Create `post-media` bucket for post images and videos
    - Set up RLS policies for secure access
    - Allow authenticated users to upload/view media for their posts

  2. Security
    - Users can only upload media to their own folder
    - Public read access for post media (since posts can be public)
    - Users can delete their own media
*/

-- Create post-media bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-media', 'post-media', true);

-- Allow authenticated users to upload post media
CREATE POLICY "Users can upload post media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to post media
CREATE POLICY "Public can view post media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'post-media');

-- Allow users to delete their own post media
CREATE POLICY "Users can delete their own post media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'post-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);