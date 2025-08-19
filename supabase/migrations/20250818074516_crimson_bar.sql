/*
  # Create Lost & Found Photos Storage Bucket

  1. Storage Bucket
    - `lost-found-photos` bucket for lost and found pet photos
  
  2. Security
    - RLS policies for secure photo access
    - Users can upload photos for their reports
    - Public read access for lost & found visibility
*/

-- Create the lost-found-photos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('lost-found-photos', 'lost-found-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies to avoid conflicts
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can upload lost found photos" ON storage.objects;
  DROP POLICY IF EXISTS "Lost found photos are publicly viewable" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their lost found photos" ON storage.objects;
END $$;

-- Create storage policies for lost-found-photos bucket
CREATE POLICY "Users can upload lost found photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'lost-found-photos');

CREATE POLICY "Lost found photos are publicly viewable"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'lost-found-photos');

CREATE POLICY "Users can delete their lost found photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'lost-found-photos' AND auth.uid()::text = (storage.foldername(name))[1]);