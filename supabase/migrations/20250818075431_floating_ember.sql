/*
  # Create Donations System Tables

  1. New Tables
    - `causes` - Fundraising causes and campaigns
    - `donations` - Individual donation records

  2. Security
    - Enable RLS on both tables
    - Add policies for secure access
*/

-- Create causes table
CREATE TABLE IF NOT EXISTS causes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  image_url text,
  goal_amount numeric NOT NULL CHECK (goal_amount > 0),
  raised_amount numeric DEFAULT 0 CHECK (raised_amount >= 0),
  category text NOT NULL,
  location text,
  organization_name text NOT NULL,
  organization_verified boolean DEFAULT false,
  end_date date,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create donations table
CREATE TABLE IF NOT EXISTS donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cause_id uuid NOT NULL REFERENCES causes(id) ON DELETE CASCADE,
  donor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  donor_name text,
  message text,
  is_anonymous boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_causes_category ON causes(category);
CREATE INDEX IF NOT EXISTS idx_causes_active ON causes(is_active);
CREATE INDEX IF NOT EXISTS idx_causes_created_by ON causes(created_by);
CREATE INDEX IF NOT EXISTS idx_donations_cause ON donations(cause_id);
CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations(donor_id);

-- Enable RLS
ALTER TABLE causes ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$
BEGIN
  DROP POLICY IF EXISTS "Active causes are publicly viewable" ON causes;
  DROP POLICY IF EXISTS "Users can create causes" ON causes;
  DROP POLICY IF EXISTS "Users can update their causes" ON causes;
  DROP POLICY IF EXISTS "Donations are viewable by cause creators and donors" ON donations;
  DROP POLICY IF EXISTS "Users can create donations" ON donations;
END $$;

-- Causes policies
CREATE POLICY "Active causes are publicly viewable"
  ON causes
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Users can create causes"
  ON causes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their causes"
  ON causes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Donations policies
CREATE POLICY "Donations are viewable by cause creators and donors"
  ON donations
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = donor_id OR 
    EXISTS (
      SELECT 1 FROM causes 
      WHERE causes.id = donations.cause_id AND causes.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create donations"
  ON donations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = donor_id);

-- Create updated_at trigger for causes
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS handle_causes_updated_at ON causes;
END $$;

CREATE TRIGGER handle_causes_updated_at
  BEFORE UPDATE ON causes
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();