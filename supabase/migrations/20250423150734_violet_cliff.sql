/*
  # Add and update foreign key constraints

  1. Changes
    - Add missing foreign key constraints
    - Update existing constraints with correct ON DELETE actions
    - Ensure all user references point to auth.users
    - Ensure all profile references point to profiles

  2. Security
    - Maintain data integrity with appropriate cascade actions
    - Prevent orphaned records
*/

-- Add missing foreign key constraints if they don't exist
DO $$ 
BEGIN
  -- Profiles -> auth.users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_id_fkey'
  ) THEN
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Posts -> memorials
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'posts_memorial_id_fkey'
  ) THEN
    ALTER TABLE posts
    ADD CONSTRAINT posts_memorial_id_fkey
    FOREIGN KEY (memorial_id) REFERENCES memorials(id) ON DELETE CASCADE;
  END IF;

  -- Posts -> auth.users (author)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'posts_author_id_fkey'
  ) THEN
    ALTER TABLE posts
    ADD CONSTRAINT posts_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Timeline events -> profiles (created_by)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'timeline_events_created_by_fkey'
  ) THEN
    ALTER TABLE timeline_events
    ADD CONSTRAINT timeline_events_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id);
  END IF;

  -- Tributes -> profiles (author)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tributes_author_id_fkey'
  ) THEN
    ALTER TABLE tributes
    ADD CONSTRAINT tributes_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  -- Post interactions -> posts
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'post_interactions_post_id_fkey'
  ) THEN
    ALTER TABLE post_interactions
    ADD CONSTRAINT post_interactions_post_id_fkey
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
  END IF;

  -- Post interactions -> auth.users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'post_interactions_user_id_fkey'
  ) THEN
    ALTER TABLE post_interactions
    ADD CONSTRAINT post_interactions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- User connections -> auth.users (both sides)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_connections_user1_id_fkey'
  ) THEN
    ALTER TABLE user_connections
    ADD CONSTRAINT user_connections_user1_id_fkey
    FOREIGN KEY (user1_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_connections_user2_id_fkey'
  ) THEN
    ALTER TABLE user_connections
    ADD CONSTRAINT user_connections_user2_id_fkey
    FOREIGN KEY (user2_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Media -> auth.users (uploader)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'media_uploader_id_fkey'
  ) THEN
    ALTER TABLE media
    ADD CONSTRAINT media_uploader_id_fkey
    FOREIGN KEY (uploader_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Subscriptions -> auth.users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'subscriptions_user_id_fkey'
  ) THEN
    ALTER TABLE subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Subscriptions -> products
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'subscriptions_product_id_fkey'
  ) THEN
    ALTER TABLE subscriptions
    ADD CONSTRAINT subscriptions_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;
  END IF;

  -- Orders -> auth.users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'orders_user_id_fkey'
  ) THEN
    ALTER TABLE orders
    ADD CONSTRAINT orders_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- Orders -> transactions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'orders_transaction_id_fkey'
  ) THEN
    ALTER TABLE orders
    ADD CONSTRAINT orders_transaction_id_fkey
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT;
  END IF;

  -- Order items -> orders
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'order_items_order_id_fkey'
  ) THEN
    ALTER TABLE order_items
    ADD CONSTRAINT order_items_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
  END IF;

  -- Order items -> products
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'order_items_product_id_fkey'
  ) THEN
    ALTER TABLE order_items
    ADD CONSTRAINT order_items_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;
  END IF;

  -- Donations -> memorials
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'donations_memorial_id_fkey'
  ) THEN
    ALTER TABLE donations
    ADD CONSTRAINT donations_memorial_id_fkey
    FOREIGN KEY (memorial_id) REFERENCES memorials(id) ON DELETE CASCADE;
  END IF;

  -- Donations -> transactions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'donations_transaction_id_fkey'
  ) THEN
    ALTER TABLE donations
    ADD CONSTRAINT donations_transaction_id_fkey
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT;
  END IF;

  -- Donations -> auth.users (donor)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'donations_donor_id_fkey'
  ) THEN
    ALTER TABLE donations
    ADD CONSTRAINT donations_donor_id_fkey
    FOREIGN KEY (donor_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;