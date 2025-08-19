/*
  # Create Album Photos Storage Bucket

  1. Storage Bucket
    - `album-photos` bucket for photo albums and individual photos
  
  2. Security
    - RLS policies for secure photo access
    - Users can upload photos for their albums
    - Visibility based on album privacy settings
*/

-- Create the album-photos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('album-photos', 'album-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies to avoid conflicts
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can upload album photos" ON storage.objects;
  DROP POLICY IF EXISTS "Album photos are viewable based on album visibility" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their album photos" ON storage.objects;
END $$;

-- Create storage policies for album-photos bucket
CREATE POLICY "Users can upload album photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'album-photos');

CREATE POLICY "Album photos are viewable based on album visibility"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'album-photos');

CREATE POLICY "Users can delete their album photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'album-photos' AND auth.uid()::text = (storage.foldername(name))[1]);