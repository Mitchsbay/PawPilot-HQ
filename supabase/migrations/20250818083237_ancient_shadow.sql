/*
  # Create Saved Posts Table

  1. New Table
    - `saved_posts` - Track user's saved posts for later viewing

  2. Security
    - Enable RLS on saved_posts table
    - Add policies for secure access
*/

-- Create saved_posts table
CREATE TABLE IF NOT EXISTS saved_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_saved_posts_user ON saved_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_post ON saved_posts(post_id);

-- Enable RLS
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view their saved posts" ON saved_posts;
  DROP POLICY IF EXISTS "Users can save posts" ON saved_posts;
  DROP POLICY IF EXISTS "Users can unsave posts" ON saved_posts;
END $$;

-- RLS Policies for saved_posts
CREATE POLICY "Users can view their saved posts"
  ON saved_posts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can save posts"
  ON saved_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unsave posts"
  ON saved_posts
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());