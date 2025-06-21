/*
  # Populate initial product catalog
  
  1. Initial Products
    - Basic Subscription Plan
    - Donation Option
    - Digital Candle
    
  2. Notes
    - Prices are in ILS (Israeli Shekel)
    - Stripe Price IDs are placeholders to be updated later
*/

INSERT INTO public.products (
  name,
  description,
  price,
  type,
  is_active,
  metadata
) VALUES
-- Basic Subscription Plan
(
  'תוכנית בסיסית',
  'מינוי גישה סטנדרטי',
  9.99,
  'SERVICE',
  true,
  jsonb_build_object(
    'stripe_price_id', 'price_REPLACE_ME_PLAN',
    'currency', 'ILS'
  )
),
-- Donation Option
(
  'תרומה',
  'אפשרות לתרום לדף הנצחה',
  0.00,
  'SERVICE',
  true,
  jsonb_build_object('currency', 'ILS')
),
-- Digital Candle
(
  'נר דיגיטלי',
  'הדלקת נר וירטואלי בדף ההנצחה',
  5.00,
  'DIGITAL',
  true,
  jsonb_build_object(
    'stripe_price_id', 'price_REPLACE_ME_CANDLE',
    'duration_days', 7,
    'currency', 'ILS'
  )
);