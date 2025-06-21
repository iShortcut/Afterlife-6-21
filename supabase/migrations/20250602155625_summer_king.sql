/*
  # Fix notifications RLS policies

  1. Changes
    - Add RLS policy for notifications table to allow users to subscribe to their own notifications
    - Enable RLS on notifications table if not already enabled
    - Ensure authenticated users can only access their own notifications

  2. Security
    - Restrict users to only see notifications where they are the recipient
    - Enable RLS to enforce access control
*/

-- Enable RLS on notifications table if not already enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can subscribe to their own notifications" ON notifications;

-- Add policy for viewing notifications
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
TO authenticated
USING (recipient_id = auth.uid());

-- Add policy specifically for realtime subscriptions
CREATE POLICY "Users can subscribe to their own notifications"
ON notifications FOR ALL
TO authenticated
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());