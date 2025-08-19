/*
  # Add RLS Policies for Albums and Album Photos

  1. Albums Table Policies
    - Users can manage their own albums
    - Albums visible based on visibility settings
  
  2. Album Photos Table Policies
    - Users can manage photos in their albums
    - Photos visible based on album visibility
*/

-- Drop existing policies to avoid conflicts
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage their albums" ON albums;
  DROP POLICY IF EXISTS "Albums visible based on visibility settings" ON albums;
  DROP POLICY IF EXISTS "Users can manage their album photos" ON album_photos;
  DROP POLICY IF EXISTS "Album photos visible based on album visibility" ON album_photos;
END $$;

-- Albums policies
CREATE POLICY "Users can manage their albums"
  ON albums
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Albums visible based on visibility settings"
  ON albums
  FOR SELECT
  TO public
  USING (
    visibility = 'public' OR 
    owner_id = auth.uid() OR 
    (visibility = 'friends' AND EXISTS (
      SELECT 1 FROM user_follows 
      WHERE (follower_id = auth.uid() AND following_id = owner_id) OR 
            (follower_id = owner_id AND following_id = auth.uid())
    ))
  );

-- Album photos policies
CREATE POLICY "Users can manage their album photos"
  ON album_photos
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM albums 
    WHERE albums.id = album_photos.album_id AND albums.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM albums 
    WHERE albums.id = album_photos.album_id AND albums.owner_id = auth.uid()
  ));

CREATE POLICY "Album photos visible based on album visibility"
  ON album_photos
  FOR SELECT
  TO public
  USING (EXISTS (
    SELECT 1 FROM albums 
    WHERE albums.id = album_photos.album_id AND (
      albums.visibility = 'public' OR 
      albums.owner_id = auth.uid() OR 
      (albums.visibility = 'friends' AND EXISTS (
        SELECT 1 FROM user_follows 
        WHERE (follower_id = auth.uid() AND following_id = albums.owner_id) OR 
              (follower_id = albums.owner_id AND following_id = auth.uid())
      ))
    )
  ));