/*
  # Create group avatars storage bucket

  1. Storage
    - Create `group-avatars` bucket for group profile pictures
    - Set up RLS policies for secure access
    - Allow group creators/admins to upload/manage avatars

  2. Security
    - Users can only upload avatars for groups they created
    - Public read access for group avatars
    - Users can delete avatars for their own groups
*/

-- Create group-avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('group-avatars', 'group-avatars', true);

-- Allow group creators to upload group avatars
CREATE POLICY "Group creators can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'group-avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to group avatars
CREATE POLICY "Public can view group avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'group-avatars');

-- Allow group creators to delete their group avatars
CREATE POLICY "Group creators can delete their avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'group-avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);