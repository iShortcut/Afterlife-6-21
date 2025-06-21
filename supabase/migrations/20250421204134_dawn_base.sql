/*
  # Add theme support to memorials

  1. New Tables
    - `themes`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `description` (text)
      - `css_variables` (jsonb)
      - `created_at` (timestamp)

  2. Changes
    - Add `theme_id` column to `memorials` table
    - Add foreign key constraint to themes table

  3. Security
    - Enable RLS on themes table
    - Add policy for public read access to themes
*/

-- Create themes table
CREATE TABLE public.themes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text UNIQUE NOT NULL,
    description text,
    css_variables jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

-- Add some default themes
INSERT INTO public.themes (name, description, css_variables) VALUES
('Classic', 'A timeless, elegant theme with muted colors', '{
    "--memorial-primary-color": "#4F46E5",
    "--memorial-secondary-color": "#6B7280",
    "--memorial-background-color": "#F8FAFC",
    "--memorial-text-color": "#1F2937",
    "--memorial-accent-color": "#E2E8F0"
}'::jsonb),
('Modern', 'Clean and minimalist with bold accents', '{
    "--memorial-primary-color": "#2563EB",
    "--memorial-secondary-color": "#64748B",
    "--memorial-background-color": "#FFFFFF",
    "--memorial-text-color": "#0F172A",
    "--memorial-accent-color": "#F1F5F9"
}'::jsonb),
('Serene', 'Peaceful and calming with natural tones', '{
    "--memorial-primary-color": "#059669",
    "--memorial-secondary-color": "#71717A",
    "--memorial-background-color": "#F9FAFB",
    "--memorial-text-color": "#1F2937",
    "--memorial-accent-color": "#E5E7EB"
}'::jsonb);

-- Add theme_id to memorials
ALTER TABLE public.memorials 
ADD COLUMN theme_id uuid REFERENCES public.themes(id);

-- Enable RLS on themes
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;

-- Add public read access to themes
CREATE POLICY "Anyone can view themes"
    ON public.themes
    FOR SELECT
    TO public
    USING (true);