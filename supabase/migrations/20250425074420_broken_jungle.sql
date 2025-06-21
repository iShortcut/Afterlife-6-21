/*
  # Add chat functionality

  1. New Tables
    - `chat_threads`
      - `id` (uuid, primary key)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `title` (text, nullable, for group chats)
      - `is_group` (boolean)
    
    - `chat_participants`
      - `thread_id` (uuid, references chat_threads)
      - `user_id` (uuid, references profiles)
      - `last_read_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
    
    - `chat_messages`
      - `id` (uuid, primary key)
      - `thread_id` (uuid, references chat_threads)
      - `sender_id` (uuid, references profiles)
      - `content` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for:
      - Users can only access threads they participate in
      - Users can only send messages to threads they participate in
      - Users can only see messages in threads they participate in

  3. Triggers
    - Update thread's updated_at when a new message is added
*/

-- Create chat_threads table
CREATE TABLE IF NOT EXISTS chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  title text,
  is_group boolean DEFAULT false NOT NULL
);

-- Create chat_participants table
CREATE TABLE IF NOT EXISTS chat_participants (
  thread_id uuid REFERENCES chat_threads(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  last_read_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (thread_id, user_id)
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES chat_threads(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_id ON chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Enable RLS
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger for chat_threads
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON chat_threads
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Create trigger to update thread's updated_at when a new message is added
CREATE OR REPLACE FUNCTION update_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_threads
  SET updated_at = NEW.created_at
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_thread_timestamp
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_timestamp();

-- Create policies for chat_threads
CREATE POLICY "Users can access threads they participate in"
  ON chat_threads
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE thread_id = id
      AND user_id = auth.uid()
    )
  );

-- Create policies for chat_participants
CREATE POLICY "Users can see participants in their threads"
  ON chat_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE thread_id = chat_participants.thread_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add participants to their group threads"
  ON chat_participants
  FOR INSERT
  WITH CHECK (
    (
      -- User is adding themselves to a thread
      user_id = auth.uid()
    ) OR (
      -- User is adding someone else to a group thread they're in
      EXISTS (
        SELECT 1 FROM chat_threads t
        JOIN chat_participants p ON p.thread_id = t.id
        WHERE t.id = thread_id
        AND p.user_id = auth.uid()
        AND t.is_group = true
      )
    )
  );

CREATE POLICY "Users can update their own participant record"
  ON chat_participants
  FOR UPDATE
  USING (user_id = auth.uid());

-- Create policies for chat_messages
CREATE POLICY "Users can see messages in their threads"
  ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE thread_id = chat_messages.thread_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their threads"
  ON chat_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE thread_id = chat_messages.thread_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own messages"
  ON chat_messages
  FOR DELETE
  USING (sender_id = auth.uid());

-- Add comments
COMMENT ON TABLE chat_threads IS 'Chat conversation threads';
COMMENT ON TABLE chat_participants IS 'Participants in chat threads with read status';
COMMENT ON TABLE chat_messages IS 'Individual chat messages';