/*
  # Force Schema Reload
  
  This migration forces PostgREST to reload its schema cache by making a harmless schema change.
*/

-- Add a comment to force schema cache reload
COMMENT ON TABLE follows IS 'Tracks user follow relationships';
