/*
  # Add RLS Policies for Reels

  1. Reels Table Policies
    - Users can manage their own reels
    - Reels visible based on visibility settings
*/

-- Drop existing policies to avoid conflicts
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage their reels" ON reels;
  DROP POLICY IF EXISTS "Reels visible based on visibility settings" ON reels;
END $$;

-- Reels policies
CREATE POLICY "Users can manage their reels"
  ON reels
  FOR ALL
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Reels visible based on visibility settings"
  ON reels
  FOR SELECT
  TO public
  USING (
    visibility = 'public' OR 
    author_id = auth.uid() OR 
    (visibility = 'friends' AND EXISTS (
      SELECT 1 FROM user_follows 
      WHERE (follower_id = auth.uid() AND following_id = author_id) OR 
            (follower_id = author_id AND following_id = auth.uid())
    ))
  );