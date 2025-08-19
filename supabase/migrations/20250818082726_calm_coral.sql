/*
  # Create User Blocks Table

  1. New Table
    - `user_blocks` - Track blocked user relationships

  2. Security
    - Enable RLS on user_blocks table
    - Add policies for secure blocking functionality
*/

-- Create user_blocks table
CREATE TABLE IF NOT EXISTS user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_user_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_user_id);

-- Enable RLS
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view their blocks" ON user_blocks;
  DROP POLICY IF EXISTS "Users can create blocks" ON user_blocks;
  DROP POLICY IF EXISTS "Users can delete their blocks" ON user_blocks;
END $$;

-- RLS Policies for user_blocks
CREATE POLICY "Users can view their blocks"
  ON user_blocks
  FOR SELECT
  TO authenticated
  USING (blocker_id = auth.uid());

CREATE POLICY "Users can create blocks"
  ON user_blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can delete their blocks"
  ON user_blocks
  FOR DELETE
  TO authenticated
  USING (blocker_id = auth.uid());