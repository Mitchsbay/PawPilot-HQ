/*
  # Final Mile Database Schema

  1. New Tables
    - `push_subscriptions` - Browser push notification subscriptions
    - `user_presence` - Real-time user presence and last seen tracking
    - `message_attachments` - File attachments for messages
    - `activity_feed` - User activity feed for profiles
    - `privacy_rules` - Advanced privacy control rules
    - `privacy_rule_overrides` - Per-user privacy exceptions
    - `app_events` - Application telemetry and event logging

  2. Security
    - Enable RLS on all new tables
    - Add appropriate policies for each table
    - Ensure proper access controls

  3. Performance
    - Add indexes for optimal query performance
    - Optimize for real-time operations
*/

-- 1) PUSH NOTIFICATIONS
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 2) REALTIME PRESENCE
CREATE TABLE IF NOT EXISTS user_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online','away','offline'))
);

-- 3) MESSAGE ATTACHMENTS
CREATE TABLE IF NOT EXISTS message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes >= 0),
  created_at timestamptz DEFAULT now()
);

-- 4) PROFILE ACTIVITY FEED
CREATE TABLE IF NOT EXISTS activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verb text NOT NULL,
  object_type text NOT NULL,
  object_id uuid,
  visibility text NOT NULL DEFAULT 'followers' CHECK (visibility IN ('public','followers','friends','private','custom')),
  created_at timestamptz DEFAULT now()
);

-- 5) ADVANCED PRIVACY CONTROLS
CREATE TABLE IF NOT EXISTS privacy_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope text NOT NULL,
  rule text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS privacy_rule_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES privacy_rules(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  allow boolean NOT NULL
);

-- 6) APP EVENTS (telemetry)
CREATE TABLE IF NOT EXISTS app_events (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  event text NOT NULL,
  meta jsonb,
  occurred_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_rule_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_events ENABLE ROW LEVEL SECURITY;

-- Push Subscriptions Policies
CREATE POLICY "own push subscriptions read"
ON push_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "server upsert push"
ON push_subscriptions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Presence Policies
CREATE POLICY "presence read all" 
ON user_presence FOR SELECT 
USING (true);

CREATE POLICY "presence upsert own" 
ON user_presence FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "presence update own" 
ON user_presence FOR UPDATE 
USING (auth.uid() = user_id);

-- Message Attachments Policies
CREATE POLICY "attachments read by message visibility"
ON message_attachments FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM messages m 
    JOIN thread_participants tp ON m.thread_id = tp.thread_id
    WHERE m.id = message_id AND tp.user_id = auth.uid()
  )
);

CREATE POLICY "attachments insert by author"
ON message_attachments FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM messages m 
    WHERE m.id = message_id AND m.sender_id = auth.uid()
  )
);

-- Activity Feed Policies
CREATE POLICY "activity author write"
ON activity_feed FOR INSERT 
WITH CHECK (actor_id = auth.uid());

CREATE POLICY "activity read by visibility"
ON activity_feed FOR SELECT 
USING (
  CASE visibility
    WHEN 'public' THEN true
    WHEN 'followers' THEN EXISTS (
      SELECT 1 FROM user_follows f 
      WHERE f.following_id = subject_user_id AND f.follower_id = auth.uid()
    )
    WHEN 'friends' THEN EXISTS (
      SELECT 1 FROM user_follows f1
      JOIN user_follows f2 ON f1.following_id = f2.follower_id AND f1.follower_id = f2.following_id
      WHERE f1.follower_id = auth.uid() AND f1.following_id = subject_user_id
    )
    WHEN 'private' THEN auth.uid() = subject_user_id
    ELSE true
  END
);

-- Privacy Rules Policies
CREATE POLICY "privacy read own"
ON privacy_rules FOR SELECT 
USING (owner_id = auth.uid());

CREATE POLICY "privacy write own"
ON privacy_rules FOR ALL 
USING (owner_id = auth.uid()) 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "privacy overrides read own"
ON privacy_rule_overrides FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM privacy_rules pr 
    WHERE pr.id = rule_id AND pr.owner_id = auth.uid()
  )
);

CREATE POLICY "privacy overrides write own"
ON privacy_rule_overrides FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM privacy_rules pr 
    WHERE pr.id = rule_id AND pr.owner_id = auth.uid()
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM privacy_rules pr 
    WHERE pr.id = rule_id AND pr.owner_id = auth.uid()
  )
);

-- App Events Policies
CREATE POLICY "app events write authenticated"
ON app_events FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence (status, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON message_attachments (message_id);
CREATE INDEX IF NOT EXISTS idx_activity_subject_time ON activity_feed (subject_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_visibility ON activity_feed (visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_privacy_rules_owner_scope ON privacy_rules (owner_id, scope);
CREATE INDEX IF NOT EXISTS idx_privacy_overrides_rule ON privacy_rule_overrides (rule_id);
CREATE INDEX IF NOT EXISTS idx_app_events_user_time ON app_events (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_events_event_time ON app_events (event, occurred_at DESC);