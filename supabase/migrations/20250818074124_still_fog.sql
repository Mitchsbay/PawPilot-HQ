/*
  # Create post media storage bucket with idempotent policies

  1. Storage Setup
    - Create `post-media` bucket for social media uploads
    - Enable public access for sharing posts
  
  2. Security Policies
    - Users can upload files to their own folder
    - All users can view public post media
    - Users can delete their own files
*/

-- Create storage bucket for post media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media',
  'post-media',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/mov', 'video/avi']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist, then create new ones
DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can upload post media" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view post media" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own post media" ON storage.objects;
  
  -- Create new policies
  CREATE POLICY "Users can upload post media"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'post-media' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );

  CREATE POLICY "Anyone can view post media"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'post-media');

  CREATE POLICY "Users can delete own post media"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'post-media' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );
END $$;