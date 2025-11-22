/*
  # Add Logo Support to Sponsor System

  1. Changes
    - Add `logo_url` column to `sponsor_requests` table
    - Add `logo_url` column to `sponsors` table
    - Both columns are nullable text fields to store logo image URLs

  2. Purpose
    - Allow users to upload a logo when submitting sponsor requests
    - Display logos for active sponsors on the main page
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sponsor_requests' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE sponsor_requests ADD COLUMN logo_url text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sponsors' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE sponsors ADD COLUMN logo_url text;
  END IF;
END $$;
