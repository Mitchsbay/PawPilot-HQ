/*
  # Create Message Reactions Table

  1. New Table
    - `message_reactions` - Track emoji reactions on messages

  2. Security
    - Enable RLS on message_reactions table
    - Add policies for secure access
*/

-- Create message_reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON message_reactions(user_id);

-- Enable RLS
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view reactions in their threads" ON message_reactions;
  DROP POLICY IF EXISTS "Users can add reactions" ON message_reactions;
  DROP POLICY IF EXISTS "Users can remove their reactions" ON message_reactions;
END $$;

-- RLS Policies for message_reactions
CREATE POLICY "Users can view reactions in their threads"
  ON message_reactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM messages
      JOIN thread_participants ON messages.thread_id = thread_participants.thread_id
      WHERE messages.id = message_reactions.message_id 
      AND thread_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add reactions"
  ON message_reactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM messages
      JOIN thread_participants ON messages.thread_id = thread_participants.thread_id
      WHERE messages.id = message_reactions.message_id 
      AND thread_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove their reactions"
  ON message_reactions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());