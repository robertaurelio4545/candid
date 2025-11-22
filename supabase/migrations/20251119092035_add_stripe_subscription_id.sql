/*
  # Add Stripe Subscription ID to Profiles

  1. Changes
    - Add stripe_subscription_id column to profiles table
    - Add stripe_customer_id column to profiles table for future use
  
  2. Purpose
    - Store Stripe subscription ID to enable proper subscription cancellation
    - Store customer ID for managing customer data in Stripe
  
  3. Security
    - No RLS changes needed - existing policies cover these fields
*/

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS stripe_customer_id text;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id 
ON profiles(stripe_subscription_id) 
WHERE stripe_subscription_id IS NOT NULL;
