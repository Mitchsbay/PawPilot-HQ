/*
  # Storage Buckets Setup

  1. Create Storage Buckets
    - avatars: User profile pictures
    - pet-photos: Pet photos and album images
    - reels: Video content
    - health-attachments: Health record files

  2. Storage Policies
    - Public read access for avatars and pet photos
    - Authenticated upload access
    - Owner-only access for health attachments
*/

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('avatars', 'avatars', true),
  ('pet-photos', 'pet-photos', true),
  ('reels', 'reels', true),
  ('health-attachments', 'health-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policies for pet-photos bucket
CREATE POLICY "Pet photos are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pet-photos');

CREATE POLICY "Users can upload pet photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pet-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their pet photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'pet-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their pet photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'pet-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policies for reels bucket
CREATE POLICY "Reels are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reels');

CREATE POLICY "Users can upload reels"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'reels' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their reels"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'reels' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their reels"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'reels' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policies for health-attachments bucket (private)
CREATE POLICY "Users can view their own health attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'health-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload health attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'health-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their health attachments"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'health-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their health attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'health-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);