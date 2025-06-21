/*
  # Add friend system

  1. New Tables
    - `user_connections`
      - `id` (uuid, primary key)
      - `user1_id` (uuid, references users)
      - `user2_id` (uuid, references users)
      - `status` (text: 'PENDING', 'ACCEPTED', 'BLOCKED')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for:
      - Users can view their own connections
      - Users can create/update/delete their own connections
*/

-- Create user_connections table
CREATE TABLE public.user_connections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    user2_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status text NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED', 'BLOCKED')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user1_id, user2_id)
);

-- Create updated_at trigger
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.user_connections
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own connections"
    ON public.user_connections
    FOR SELECT
    USING (
        auth.uid() IN (user1_id, user2_id)
    );

CREATE POLICY "Users can create connections"
    ON public.user_connections
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user1_id
    );

CREATE POLICY "Users can update their own connections"
    ON public.user_connections
    FOR UPDATE
    USING (
        auth.uid() IN (user1_id, user2_id)
    );

CREATE POLICY "Users can delete their own connections"
    ON public.user_connections
    FOR DELETE
    USING (
        auth.uid() IN (user1_id, user2_id)
    );