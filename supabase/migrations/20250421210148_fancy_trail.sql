/*
  # Add post interactions

  1. New Tables
    - `post_interactions`
      - `id` (uuid, primary key)
      - `post_id` (uuid, references posts)
      - `user_id` (uuid, references users)
      - `type` (text, e.g., 'like')
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on post_interactions table
    - Add policies for:
      - Public read access
      - Authenticated users can create/delete their own interactions
*/

-- Create post_interactions table
CREATE TABLE public.post_interactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type text NOT NULL CHECK (type IN ('like')),
    created_at timestamptz DEFAULT now(),
    UNIQUE(post_id, user_id, type)
);

-- Enable RLS
ALTER TABLE public.post_interactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view post interactions"
    ON public.post_interactions
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Authenticated users can create interactions"
    ON public.post_interactions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interactions"
    ON public.post_interactions
    FOR DELETE
    USING (auth.uid() = user_id);