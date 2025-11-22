/*
  # Add Point Purchases Tracking

  1. New Tables
    - `point_purchases`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `package_id` (text) - identifier for the purchased package
      - `points_amount` (integer) - number of points purchased
      - `price` (numeric) - price paid
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on `point_purchases` table
    - Add policy for users to view their own purchase history
    - Add policy for admins to view all purchases
*/

CREATE TABLE IF NOT EXISTS point_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  package_id text NOT NULL,
  points_amount integer NOT NULL CHECK (points_amount > 0),
  price numeric(10,2) NOT NULL CHECK (price > 0),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE point_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchase history"
  ON point_purchases
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchases"
  ON point_purchases
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_point_purchases_user_id ON point_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_point_purchases_created_at ON point_purchases(created_at DESC);
