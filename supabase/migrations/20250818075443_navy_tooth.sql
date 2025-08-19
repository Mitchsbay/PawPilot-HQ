/*
  # Create Cause Images Storage Bucket

  1. Storage Bucket
    - `cause-images` bucket for donation cause images
  
  2. Security
    - RLS policies for secure image access
    - Users can upload images for their causes
    - Public read access for cause visibility
*/

-- Create the cause-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('cause-images', 'cause-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies to avoid conflicts
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can upload cause images" ON storage.objects;
  DROP POLICY IF EXISTS "Cause images are publicly viewable" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their cause images" ON storage.objects;
END $$;

-- Create storage policies for cause-images bucket
CREATE POLICY "Users can upload cause images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'cause-images');

CREATE POLICY "Cause images are publicly viewable"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'cause-images');

CREATE POLICY "Users can delete their cause images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'cause-images' AND auth.uid()::text = (storage.foldername(name))[1]);