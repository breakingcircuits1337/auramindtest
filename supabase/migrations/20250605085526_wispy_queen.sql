/*
  # Create admin role and initial admin user

  1. New Tables
    - `admin_users` table to track admin privileges
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on admin_users table
    - Add policy for admin access

  3. Initial Data
    - Create admin user
    - Grant admin privileges
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

-- Create the admin user safely
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Insert the user if they don't exist
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'joebruce1313@gmail.com',
    crypt('Motorola13!', gen_salt('bf')),
    now(),
    now(),
    now(),
    encode(gen_random_bytes(32), 'hex'),
    encode(gen_random_bytes(32), 'hex')
  )
  ON CONFLICT (email) DO
  UPDATE SET encrypted_password = crypt('Motorola13!', gen_salt('bf'))
  RETURNING id INTO new_user_id;

  -- Grant admin privileges
  INSERT INTO admin_users (user_id)
  VALUES (new_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END $$;