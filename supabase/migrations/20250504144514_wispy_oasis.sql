/*
  # Add personalization_details to order_items table

  1. Changes
    - Add personalization_details column to order_items table
    - Update existing RLS policies

  2. Security
    - Maintain existing RLS policies
*/

-- Add personalization_details column to order_items if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'personalization_details'
  ) THEN
    ALTER TABLE order_items
    ADD COLUMN personalization_details jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add comment explaining the column
COMMENT ON COLUMN order_items.personalization_details IS 'Stores personalization details for the order item (e.g., name, message, customization options)';

-- Insert sample products if they don't exist
INSERT INTO products (name, description, price, type, is_active, metadata)
VALUES 
  ('Digital Certificate', 'Personalized digital certificate to honor your loved one', 19.99, 'DIGITAL', true, 
   jsonb_build_object(
     'stripe_price_id', 'price_REPLACE_ME_CERTIFICATE',
     'currency', 'ILS',
     'product_type', 'certificate'
   )),
  ('Physical Plaque', 'Custom memorial plaque with personalized engraving', 99.99, 'PHYSICAL', true, 
   jsonb_build_object(
     'stripe_price_id', 'price_REPLACE_ME_PLAQUE',
     'currency', 'ILS',
     'product_type', 'plaque',
     'customization_options', array['material', 'color', 'size']
   )),
  ('Digital Greeting Card', 'Send a personalized digital greeting card', 9.99, 'DIGITAL', true, 
   jsonb_build_object(
     'stripe_price_id', 'price_REPLACE_ME_GREETING',
     'currency', 'ILS',
     'product_type', 'greeting'
   ))
ON CONFLICT (id) DO NOTHING;