/*
  # Create Email Preferences Table

  1. New Table
    - `email_preferences` - Store user email notification preferences

  2. Security
    - Enable RLS on email_preferences table
    - Add policies for secure access
*/

-- Create email_preferences table
CREATE TABLE IF NOT EXISTS email_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  daily_digest boolean DEFAULT true,
  weekly_summary boolean DEFAULT true,
  new_followers boolean DEFAULT true,
  post_interactions boolean DEFAULT false,
  messages boolean DEFAULT true,
  events boolean DEFAULT true,
  lost_found_alerts boolean DEFAULT true,
  group_activity boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_email_preferences_user ON email_preferences(user_id);

-- Enable RLS
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage their email preferences" ON email_preferences;
END $$;

-- RLS Policies for email_preferences
CREATE POLICY "Users can manage their email preferences"
  ON email_preferences
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create updated_at trigger
DO $$
BEGIN
  DROP TRIGGER IF EXISTS handle_email_preferences_updated_at ON email_preferences;
END $$;

CREATE TRIGGER handle_email_preferences_updated_at
  BEFORE UPDATE ON email_preferences
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();