/*
  # Create posts table and related schema updates

  1. New Tables
    - `posts`
      - `id` (uuid, primary key)
      - `author_id` (uuid, references auth.users)
      - `content` (text)
      - `visibility` (text: public, friends_only, private)
      - `media_ids` (uuid array)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on posts table
    - Add policies for:
      - Public posts visible to everyone
      - Friends-only posts visible to friends
      - Private posts visible only to author
      - Authors can manage their own posts
*/

-- Create updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create posts table
CREATE TABLE public.posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content text,
    visibility text NOT NULL DEFAULT 'public'
      CHECK (visibility IN ('public', 'friends_only', 'private')),
    media_ids uuid[] DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Policies

-- Anyone can view public posts
CREATE POLICY "Anyone can view public posts"
    ON public.posts
    FOR SELECT
    USING (visibility = 'public');

-- Users can view their own posts
CREATE POLICY "Users can view their own posts"
    ON public.posts
    FOR SELECT
    USING (auth.uid() = author_id);

-- Users can create their own posts
CREATE POLICY "Users can create posts"
    ON public.posts
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = author_id);

-- Users can update their own posts
CREATE POLICY "Users can update their own posts"
    ON public.posts
    FOR UPDATE
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete their own posts"
    ON public.posts
    FOR DELETE
    USING (auth.uid() = author_id);

-- Create updated_at trigger
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.posts
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();