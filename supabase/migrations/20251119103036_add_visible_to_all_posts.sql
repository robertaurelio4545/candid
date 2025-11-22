/*
  # Add visible_to_all column to posts

  1. Changes
    - Add `visible_to_all` boolean column to `posts` table
    - Defaults to false (locked posts are Pro-only by default)
    - Allows admins to make locked posts visible to everyone
  
  2. Notes
    - This gives admins control over whether locked content shows the overlay or is fully accessible
    - When true, all users can view the content without Pro subscription
*/

ALTER TABLE posts ADD COLUMN IF NOT EXISTS visible_to_all boolean DEFAULT false;
