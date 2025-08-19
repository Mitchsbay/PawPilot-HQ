/*
  # Create group avatars storage bucket with idempotent policies

  1. Storage Setup
    - Create `group-avatars` bucket for group profile pictures
    - Enable public access for displaying group avatars
  
  2. Security Policies
    - Users can upload avatars for groups they own
    - All users can view group avatars
    - Group owners can delete their group avatars
*/

-- Create storage bucket for group avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'group-avatars',
  'group-avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist, then create new ones
DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can upload group avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view group avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own group avatars" ON storage.objects;
  
  -- Create new policies
  CREATE POLICY "Users can upload group avatars"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'group-avatars' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );

  CREATE POLICY "Anyone can view group avatars"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'group-avatars');

  CREATE POLICY "Users can delete own group avatars"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'group-avatars' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );
END $$;