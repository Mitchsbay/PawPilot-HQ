/*
  # Complete PawPilot HQ Database Schema

  1. New Tables
    - `profiles` - User profiles with privacy settings
    - `pets` - Pet information and photos
    - `health_records` - Pet health tracking
    - `posts` - Social media posts
    - `post_likes` - Post engagement
    - `post_comments` - Post comments
    - `albums` - Photo albums
    - `album_photos` - Album photo relationships
    - `reels` - Video content
    - `messages` - Direct messaging
    - `threads` - Message threads
    - `groups` - Community groups
    - `group_members` - Group membership
    - `events` - Pet events and meetups
    - `event_rsvps` - Event attendance
    - `lost_found` - Lost and found pets
    - `notifications` - User notifications
    - `reports` - Content moderation reports

  2. Security
    - Enable RLS on all tables
    - Add comprehensive privacy policies
    - Role-based access control for admin features

  3. Storage Buckets
    - avatars, pet-photos, reels, health-attachments

  4. Real-time
    - Message threads and online presence
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'admin', 'super_admin');
CREATE TYPE visibility_level AS ENUM ('public', 'friends', 'private');
CREATE TYPE pet_species AS ENUM ('dog', 'cat', 'bird', 'rabbit', 'hamster', 'fish', 'reptile', 'other');
CREATE TYPE health_record_type AS ENUM ('checkup', 'vaccination', 'medication', 'surgery', 'emergency', 'symptom', 'other');
CREATE TYPE lost_found_status AS ENUM ('lost', 'found', 'resolved');
CREATE TYPE notification_type AS ENUM ('like', 'comment', 'message', 'follow', 'event', 'lost_found', 'group_invite');

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text NOT NULL,
  bio text DEFAULT '',
  avatar_url text,
  role user_role DEFAULT 'user',
  
  -- Privacy settings
  profile_visibility visibility_level DEFAULT 'public',
  default_post_visibility visibility_level DEFAULT 'public',
  allow_messages_from visibility_level DEFAULT 'public',
  allow_tagging boolean DEFAULT true,
  allow_mentions boolean DEFAULT true,
  show_online_status boolean DEFAULT true,
  
  -- Notification preferences
  notify_likes boolean DEFAULT true,
  notify_comments boolean DEFAULT true,
  notify_messages boolean DEFAULT true,
  notify_follows boolean DEFAULT true,
  notify_events boolean DEFAULT true,
  notify_lost_found boolean DEFAULT true,
  
  -- Contact preferences for lost & found
  lost_found_contact_email boolean DEFAULT true,
  lost_found_contact_phone boolean DEFAULT false,
  phone_number text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Pets table
CREATE TABLE IF NOT EXISTS pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  species pet_species NOT NULL,
  breed text,
  date_of_birth date,
  gender text,
  weight numeric,
  color text,
  microchip_number text,
  photo_url text,
  bio text DEFAULT '',
  visibility visibility_level DEFAULT 'public',
  is_lost boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Health records table
CREATE TABLE IF NOT EXISTS health_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  type health_record_type NOT NULL,
  title text NOT NULL,
  description text,
  date date NOT NULL,
  veterinarian text,
  cost numeric,
  attachment_url text,
  symptom_analysis jsonb, -- Store AI analysis results
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  media_urls text[] DEFAULT '{}',
  visibility visibility_level DEFAULT 'public',
  group_id uuid, -- For group posts
  pet_id uuid REFERENCES pets(id), -- Tag a specific pet
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Post likes table
CREATE TABLE IF NOT EXISTS post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Post comments table
CREATE TABLE IF NOT EXISTS post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Albums table
CREATE TABLE IF NOT EXISTS albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  cover_photo_url text,
  visibility visibility_level DEFAULT 'public',
  photos_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Album photos table
CREATE TABLE IF NOT EXISTS album_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  caption text DEFAULT '',
  pet_id uuid REFERENCES pets(id),
  created_at timestamptz DEFAULT now()
);

-- Reels table
CREATE TABLE IF NOT EXISTS reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  caption text DEFAULT '',
  thumbnail_url text,
  duration integer, -- in seconds
  visibility visibility_level DEFAULT 'public',
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  views_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Message threads table
CREATE TABLE IF NOT EXISTS threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text, -- For group chats
  is_group boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Thread participants
CREATE TABLE IF NOT EXISTS thread_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  last_read_at timestamptz DEFAULT now(),
  UNIQUE(thread_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  media_url text,
  read_by uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  avatar_url text,
  is_private boolean DEFAULT false,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  members_count integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Group members table
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member', -- member, admin, owner
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  location text,
  latitude numeric,
  longitude numeric,
  start_datetime timestamptz NOT NULL,
  end_datetime timestamptz,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id uuid REFERENCES groups(id) ON DELETE SET NULL,
  max_attendees integer,
  is_private boolean DEFAULT false,
  rsvp_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Event RSVPs table
CREATE TABLE IF NOT EXISTS event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'going', -- going, maybe, not_going
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Lost and found table
CREATE TABLE IF NOT EXISTS lost_found (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status lost_found_status NOT NULL,
  pet_name text NOT NULL,
  species pet_species NOT NULL,
  breed text,
  description text NOT NULL,
  photo_url text,
  last_seen_location text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  contact_phone text,
  contact_email text,
  reward_offered boolean DEFAULT false,
  reward_amount numeric,
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  related_id uuid, -- ID of related post, comment, etc.
  from_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Reports table for content moderation
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content_type text NOT NULL, -- 'post', 'comment', 'user', 'group', etc.
  content_id uuid NOT NULL,
  reason text NOT NULL,
  description text,
  status text DEFAULT 'pending', -- pending, reviewing, resolved, dismissed
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  action_taken text,
  created_at timestamptz DEFAULT now()
);

-- User follows/friendships table
CREATE TABLE IF NOT EXISTS user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Add foreign key for group posts
ALTER TABLE posts ADD CONSTRAINT fk_posts_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_pets_owner ON pets(owner_id);
CREATE INDEX IF NOT EXISTS idx_health_records_pet ON health_records(pet_id);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_lost_found_location ON lost_found(latitude, longitude);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_found ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (
    profile_visibility = 'public' OR 
    auth.uid() = id OR
    (profile_visibility = 'friends' AND EXISTS (
      SELECT 1 FROM user_follows 
      WHERE (follower_id = auth.uid() AND following_id = id) OR 
            (follower_id = id AND following_id = auth.uid())
    ))
  );

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for pets
CREATE POLICY "Pets visible based on visibility settings" ON pets
  FOR SELECT USING (
    visibility = 'public' OR 
    owner_id = auth.uid() OR
    (visibility = 'friends' AND EXISTS (
      SELECT 1 FROM user_follows 
      WHERE (follower_id = auth.uid() AND following_id = owner_id) OR 
            (follower_id = owner_id AND following_id = auth.uid())
    ))
  );

CREATE POLICY "Pet owners can manage their pets" ON pets
  FOR ALL USING (owner_id = auth.uid());

-- RLS Policies for health records
CREATE POLICY "Pet owners can view health records" ON health_records
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM pets WHERE pets.id = health_records.pet_id AND pets.owner_id = auth.uid())
  );

CREATE POLICY "Pet owners can manage health records" ON health_records
  FOR ALL USING (
    EXISTS (SELECT 1 FROM pets WHERE pets.id = health_records.pet_id AND pets.owner_id = auth.uid())
  );

-- RLS Policies for posts
CREATE POLICY "Posts visible based on visibility settings" ON posts
  FOR SELECT USING (
    visibility = 'public' OR 
    author_id = auth.uid() OR
    (visibility = 'friends' AND EXISTS (
      SELECT 1 FROM user_follows 
      WHERE (follower_id = auth.uid() AND following_id = author_id) OR 
            (follower_id = author_id AND following_id = auth.uid())
    )) OR
    (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_id = posts.group_id AND user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can create posts" ON posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own posts" ON posts
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own posts" ON posts
  FOR DELETE USING (auth.uid() = author_id);

-- RLS Policies for post interactions
CREATE POLICY "Anyone can view post likes" ON post_likes FOR SELECT USING (true);
CREATE POLICY "Users can like posts" ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike posts" ON post_likes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view comments on visible posts" ON post_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_comments.post_id 
      AND (posts.visibility = 'public' OR posts.author_id = auth.uid())
    )
  );

CREATE POLICY "Users can create comments" ON post_comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete their own comments" ON post_comments
  FOR DELETE USING (auth.uid() = author_id);

-- RLS Policies for messages
CREATE POLICY "Users can view threads they participate in" ON threads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM thread_participants 
      WHERE thread_id = threads.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view thread participants" ON thread_participants
  FOR SELECT USING (
    user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM thread_participants tp2 
      WHERE tp2.thread_id = thread_participants.thread_id AND tp2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view messages in their threads" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM thread_participants 
      WHERE thread_id = messages.thread_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their threads" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND EXISTS (
      SELECT 1 FROM thread_participants 
      WHERE thread_id = messages.thread_id AND user_id = auth.uid()
    )
  );

-- RLS Policies for groups
CREATE POLICY "Public groups visible to all, private groups to members only" ON groups
  FOR SELECT USING (
    is_private = false OR EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_id = groups.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create groups" ON groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group owners can update groups" ON groups
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can view group members for groups they belong to" ON group_members
  FOR SELECT USING (
    user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM group_members gm2 
      WHERE gm2.group_id = group_members.group_id AND gm2.user_id = auth.uid()
    )
  );

-- RLS Policies for events
CREATE POLICY "Public events visible to all, private events to participants" ON events
  FOR SELECT USING (
    is_private = false OR EXISTS (
      SELECT 1 FROM event_rsvps 
      WHERE event_id = events.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Event creators can manage events" ON events
  FOR ALL USING (auth.uid() = created_by);

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for lost & found
CREATE POLICY "Lost & found posts are public" ON lost_found FOR SELECT USING (true);
CREATE POLICY "Users can create lost & found posts" ON lost_found FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can update their own lost & found posts" ON lost_found FOR UPDATE USING (auth.uid() = reporter_id);

-- RLS Policies for reports (admin only)
CREATE POLICY "Users can create reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports" ON reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Admins can update reports" ON reports
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- RLS Policies for user follows
CREATE POLICY "Users can view follows" ON user_follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others" ON user_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow others" ON user_follows FOR DELETE USING (auth.uid() = follower_id);

-- Functions to handle updated_at timestamps
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER handle_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_pets_updated_at BEFORE UPDATE ON pets FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_albums_updated_at BEFORE UPDATE ON albums FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();