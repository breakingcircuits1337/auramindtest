/*
  # Create admin user and privileges
  
  1. New Tables
    - `admin_users` table to track admin privileges
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on admin_users table
    - Add policy for admin access
    
  3. Data
    - Create admin user using Supabase auth functions
    - Grant admin privileges to the user
*/

-- Create admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
CREATE POLICY "Admins can access everything" 
  ON admin_users
  FOR ALL 
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- Create the admin user and grant privileges
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Create user with Supabase auth function
  SELECT id INTO new_user_id 
  FROM auth.users 
  WHERE email = 'joebruce1313@gmail.com';

  IF new_user_id IS NULL THEN
    -- User doesn't exist, we'll need to create them through the API
    RAISE NOTICE 'User needs to be created through Supabase Auth API';
  ELSE
    -- Grant admin privileges if user exists
    INSERT INTO admin_users (user_id)
    VALUES (new_user_id)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;