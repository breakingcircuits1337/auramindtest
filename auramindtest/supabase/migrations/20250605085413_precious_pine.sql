/*
  # Add admin role and initial admin user

  1. New Tables
    - `admin_users` table for tracking admin privileges
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on admin_users table
    - Add policy for admin access
*/

-- Create admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
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

-- Insert the admin user
INSERT INTO auth.users (
  email,
  encrypted_password,
  email_confirmed_at,
  role
) VALUES (
  'joebruce1313@gmail.com',
  crypt('Motorola13!', gen_salt('bf')),
  now(),
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Add admin privileges
INSERT INTO admin_users (user_id)
SELECT id FROM auth.users WHERE email = 'joebruce1313@gmail.com'
ON CONFLICT DO NOTHING;