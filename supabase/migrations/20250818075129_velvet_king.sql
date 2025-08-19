/*
  # Create Reel Videos Storage Bucket

  1. Storage Bucket
    - `reel-videos` bucket for short-form video content
  
  2. Security
    - RLS policies for secure video access
    - Users can upload videos for their reels
    - Public read access for reel visibility
*/

-- Create the reel-videos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('reel-videos', 'reel-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies to avoid conflicts
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can upload reel videos" ON storage.objects;
  DROP POLICY IF EXISTS "Reel videos are publicly viewable" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their reel videos" ON storage.objects;
END $$;

-- Create storage policies for reel-videos bucket
CREATE POLICY "Users can upload reel videos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'reel-videos');

CREATE POLICY "Reel videos are publicly viewable"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'reel-videos');

CREATE POLICY "Users can delete their reel videos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'reel-videos' AND auth.uid()::text = (storage.foldername(name))[1]);