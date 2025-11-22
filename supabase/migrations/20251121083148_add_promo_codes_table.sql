/*
  # Add Promo Codes System

  1. New Tables
    - `promo_codes`
      - `id` (uuid, primary key)
      - `code` (text, unique) - The promo code string
      - `discount_percent` (integer) - Percentage discount (0-100)
      - `max_uses` (integer) - Maximum number of times this code can be used (null for unlimited)
      - `current_uses` (integer) - Current number of times used
      - `expires_at` (timestamptz, nullable) - When the code expires
      - `is_active` (boolean) - Whether the code is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `promo_code_uses`
      - `id` (uuid, primary key)
      - `promo_code_id` (uuid, foreign key to promo_codes)
      - `user_id` (uuid, foreign key to auth.users)
      - `used_at` (timestamptz)
      
  2. Security
    - Enable RLS on both tables
    - Anyone can read active promo codes (to validate them)
    - Only admins can create/modify promo codes
    - Users can view their own promo code usage history
    
  3. Initial Data
    - Insert 'candid11' promo code with 50% discount
*/

-- Create promo_codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_percent integer NOT NULL CHECK (discount_percent >= 0 AND discount_percent <= 100),
  max_uses integer,
  current_uses integer DEFAULT 0 NOT NULL,
  expires_at timestamptz,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create promo_code_uses table
CREATE TABLE IF NOT EXISTS promo_code_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid REFERENCES promo_codes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  used_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_uses ENABLE ROW LEVEL SECURITY;

-- Promo codes policies
CREATE POLICY "Anyone can read active promo codes"
  ON promo_codes
  FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Admins can insert promo codes"
  ON promo_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update promo codes"
  ON promo_codes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete promo codes"
  ON promo_codes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Promo code uses policies
CREATE POLICY "Users can view their own promo code usage"
  ON promo_code_uses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert promo code uses"
  ON promo_code_uses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_code_uses_user_id ON promo_code_uses(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_uses_promo_code_id ON promo_code_uses(promo_code_id);

-- Insert the candid11 promo code with 50% discount
INSERT INTO promo_codes (code, discount_percent, max_uses, is_active)
VALUES ('candid11', 50, NULL, true)
ON CONFLICT (code) DO NOTHING;