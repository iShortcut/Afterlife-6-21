/*
  # Add order personalization table

  1. New Tables
    - `order_personalization`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `product_id` (uuid, references products)
      - `details` (jsonb)
      - `checkout_session_id` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for:
      - Users can view their own personalization details
      - Service role can manage all personalization details
*/

-- Create order_personalization table
CREATE TABLE IF NOT EXISTS order_personalization (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  checkout_session_id text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_personalization_user_id ON order_personalization(user_id);
CREATE INDEX IF NOT EXISTS idx_order_personalization_product_id ON order_personalization(product_id);
CREATE INDEX IF NOT EXISTS idx_order_personalization_checkout_session_id ON order_personalization(checkout_session_id);

-- Enable RLS
ALTER TABLE order_personalization ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own personalization details"
  ON order_personalization
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all personalization details"
  ON order_personalization
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE order_personalization IS 'Stores personalization details for product orders';