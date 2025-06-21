/*
  # Refine RLS policies for monetization tables

  1. Changes
    - Drop existing policies
    - Add more granular policies with proper checks
    - Add service role bypass policies
    - Improve security for financial records

  2. Security
    - Strict read/write controls
    - Service role access for webhooks
    - Protected financial data
*/

-- Products table policies
DROP POLICY IF EXISTS "Anyone can view active products" ON products;

CREATE POLICY "Anyone can view active products"
  ON products
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role can manage products"
  ON products
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Subscriptions table policies
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;

CREATE POLICY "Users can view their own subscriptions"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
  ON subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Transactions table policies
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;

CREATE POLICY "Users can view their own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage transactions"
  ON transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Donations table policies
DROP POLICY IF EXISTS "Anyone can view non-anonymous donations" ON donations;
DROP POLICY IF EXISTS "Users can view their own donations" ON donations;
DROP POLICY IF EXISTS "Users can create donations" ON donations;

CREATE POLICY "Anyone can view non-anonymous donations"
  ON donations
  FOR SELECT
  USING (
    NOT is_anonymous 
    AND EXISTS (
      SELECT 1 FROM memorials m 
      WHERE m.id = memorial_id 
      AND m.visibility = 'public'
    )
  );

CREATE POLICY "Users can view their own donations"
  ON donations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = donor_id);

CREATE POLICY "Service role can manage donations"
  ON donations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Orders table policies
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;

CREATE POLICY "Users can view their own orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage orders"
  ON orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Order items table policies
DROP POLICY IF EXISTS "Users can view their own order items" ON order_items;

CREATE POLICY "Users can view order items for their orders"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
      AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage order items"
  ON order_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comments explaining policies
COMMENT ON POLICY "Service role can manage products" ON products IS 'Allows service role (webhooks, functions) full access to products';
COMMENT ON POLICY "Service role can manage subscriptions" ON subscriptions IS 'Allows service role to handle subscription updates from webhooks';
COMMENT ON POLICY "Service role can manage transactions" ON transactions IS 'Allows service role to create and update transaction records';
COMMENT ON POLICY "Service role can manage donations" ON donations IS 'Allows service role to process donation records from webhooks';
COMMENT ON POLICY "Service role can manage orders" ON orders IS 'Allows service role to handle order processing and updates';
COMMENT ON POLICY "Service role can manage order items" ON order_items IS 'Allows service role to manage order items during checkout';