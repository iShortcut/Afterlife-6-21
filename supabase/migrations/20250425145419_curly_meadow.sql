/*
  # Create notifications table and policies

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `recipient_id` (uuid, references profiles)
      - `sender_id` (uuid, references profiles)
      - `type` (text) - Type of notification (e.g., 'LIKE', 'COMMENT', 'FOLLOW')
      - `entity_type` (text) - Type of entity the notification is about (e.g., 'POST', 'MEMORIAL')
      - `entity_id` (uuid) - ID of the entity
      - `message` (text) - Notification message
      - `is_read` (boolean) - Whether the notification has been read
      - `created_at` (timestamptz)
      - `metadata` (jsonb) - Additional notification data

  2. Security
    - Enable RLS on notifications table
    - Add policies for:
      - Users can view their own notifications
      - Users can mark their own notifications as read
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('LIKE', 'COMMENT', 'FOLLOW', 'TRIBUTE', 'MEMORIAL_UPDATE', 'FRIEND_REQUEST')),
  entity_type text NOT NULL CHECK (entity_type IN ('POST', 'MEMORIAL', 'PROFILE', 'TRIBUTE', 'COMMENT')),
  entity_id uuid NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  p_recipient_id uuid,
  p_sender_id uuid,
  p_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_message text,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS notifications AS $$
DECLARE
  v_notification notifications;
BEGIN
  INSERT INTO notifications (
    recipient_id,
    sender_id,
    type,
    entity_type,
    entity_id,
    message,
    metadata
  ) VALUES (
    p_recipient_id,
    p_sender_id,
    p_type,
    p_entity_type,
    p_entity_id,
    p_message,
    p_metadata
  )
  RETURNING * INTO v_notification;

  RETURN v_notification;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;