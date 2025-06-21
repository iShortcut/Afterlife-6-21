/*
  # Create initial schema for Memoriam app

  1. New Tables
    - `profiles` - Store user profile information
    - `memorials` - Store memorial page information
    - `tributes` - Store tributes (comments) on memorials
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create memorials table
CREATE TABLE IF NOT EXISTS memorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  bio TEXT,
  birth_date DATE,
  death_date DATE,
  is_public BOOLEAN DEFAULT true NOT NULL,
  profile_image_url TEXT,
  cover_image_url TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create tributes table
CREATE TABLE IF NOT EXISTS tributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  memorial_id UUID NOT NULL REFERENCES memorials(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES tributes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memorials ENABLE ROW LEVEL SECURITY;
ALTER TABLE tributes ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Create policies for memorials
CREATE POLICY "Anyone can view public memorials"
  ON memorials
  FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view their own memorials regardless of visibility"
  ON memorials
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create memorials"
  ON memorials
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memorials"
  ON memorials
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memorials"
  ON memorials
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for tributes
CREATE POLICY "Anyone can view tributes on public memorials"
  ON tributes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memorials
      WHERE memorials.id = tributes.memorial_id
      AND memorials.is_public = true
    )
  );

CREATE POLICY "Users can view tributes on their own memorials"
  ON tributes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memorials
      WHERE memorials.id = tributes.memorial_id
      AND memorials.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create tributes"
  ON tributes
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own tributes"
  ON tributes
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tributes"
  ON tributes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('memorial-images', 'Memorial Images', true);

-- Create storage policies
CREATE POLICY "Anyone can view public memorial images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'memorial-images');

CREATE POLICY "Authenticated users can upload memorial images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'memorial-images'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update their own memorial images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'memorial-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own memorial images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'memorial-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create functions for managing profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set up trigger to create a profile when a user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();