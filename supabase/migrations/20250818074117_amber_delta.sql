/*
  # Create health attachments storage bucket with idempotent policies

  1. Storage Setup
    - Create `health-attachments` bucket for medical documents and photos
    - Enable public access for authenticated users to their own files
  
  2. Security Policies
    - Users can upload files to their own folder
    - Users can view/download their own files
    - Files are organized by user ID for security
*/

-- Create storage bucket for health attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'health-attachments',
  'health-attachments',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist, then create new ones
DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can upload health attachments" ON storage.objects;
  DROP POLICY IF EXISTS "Users can view own health attachments" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own health attachments" ON storage.objects;
  
  -- Create new policies
  CREATE POLICY "Users can upload health attachments"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'health-attachments' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );

  CREATE POLICY "Users can view own health attachments"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'health-attachments' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );

  CREATE POLICY "Users can delete own health attachments"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'health-attachments' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );
END $$;