/*
  # Create Scheduled Posts Table

  1. New Table
    - `scheduled_posts` - Store draft and scheduled posts

  2. Security
    - Enable RLS on scheduled_posts table
    - Add policies for secure access
*/

-- Create scheduled_posts table
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  visibility visibility_level DEFAULT 'public',
  pet_id uuid REFERENCES pets(id) ON DELETE SET NULL,
  scheduled_for timestamptz,
  is_draft boolean DEFAULT false,
  status text DEFAULT 'draft', -- draft, scheduled, published, failed
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_author ON scheduled_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_for ON scheduled_posts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);

-- Enable RLS
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage their scheduled posts" ON scheduled_posts;
END $$;

-- RLS Policies for scheduled_posts
CREATE POLICY "Users can manage their scheduled posts"
  ON scheduled_posts
  FOR ALL
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS handle_scheduled_posts_updated_at ON scheduled_posts;
END $$;

CREATE TRIGGER handle_scheduled_posts_updated_at
  BEFORE UPDATE ON scheduled_posts
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();