/*
  # Add deceased_description to events table

  1. New Columns
    - `deceased_description` (text) - Detailed description of the deceased person associated with an event
  
  2. Changes
    - Adds a new column to the events table to store information about the deceased person
*/

-- Add the deceased_description column to the events table
ALTER TABLE public.events 
ADD COLUMN deceased_description TEXT;

-- No need to modify RLS policies as the existing policies for the events table
-- already handle access control for all columns including the new one.
-- The existing UPDATE policy allows event creators to modify all fields.