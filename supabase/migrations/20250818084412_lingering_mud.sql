/*
  # Create Push Subscriptions Table

  1. New Table
    - `push_subscriptions` - Store browser push notification subscriptions

  2. Security
    - Enable RLS on push_subscriptions table
    - Add policies for secure access
*/

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription jsonb NOT NULL,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage their push subscriptions" ON push_subscriptions;
END $$;

-- RLS Policies for push_subscriptions
CREATE POLICY "Users can manage their push subscriptions"
  ON push_subscriptions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create updated_at trigger
DO $$
BEGIN
  DROP TRIGGER IF EXISTS handle_push_subscriptions_updated_at ON push_subscriptions;
END $$;

CREATE TRIGGER handle_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();