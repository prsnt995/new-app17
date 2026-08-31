-- ============================================================================
-- NamasteMart — Full Supabase Migration
-- Firebase → Supabase (PostgreSQL + Auth + RLS)
-- ============================================================================

-- ── EXTENSIONS ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── PROFILES (replaces Firestore 'users' collection) ──────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'customer',
  addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  email_verified BOOLEAN DEFAULT false,
  profile_setup_complete BOOLEAN DEFAULT false,
  push_token TEXT DEFAULT '',
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar, email_verified, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar', NEW.raw_user_meta_data->>'picture', ''),
    COALESCE((NEW.raw_user_meta_data->>'email_verified')::boolean, false),
    (extract(epoch from now()) * 1000)::bigint,
    (extract(epoch from now()) * 1000)::bigint
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── PRODUCTS (replaces Firestore 'products' collection) ───────────────────
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'All',
  description TEXT DEFAULT '',
  price_krw NUMERIC NOT NULL DEFAULT 0,
  old_price_krw NUMERIC DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  final_price NUMERIC DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  available BOOLEAN DEFAULT true,
  is_hidden BOOLEAN DEFAULT false,
  images JSONB DEFAULT '[]'::jsonb,
  keywords JSONB DEFAULT '{}'::jsonb,
  weight_kg NUMERIC DEFAULT 0.5,
  size TEXT DEFAULT '',
  origin TEXT DEFAULT '',
  rating NUMERIC DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- ── ORDERS (replaces Firestore 'orders' collection) ───────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer JSONB NOT NULL DEFAULT '{}'::jsonb,
  delivery_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  recipient JSONB NOT NULL DEFAULT '{}'::jsonb,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  shipping_fee NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  total_weight_kg NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Payment Pending',
  order_status TEXT DEFAULT 'PENDING',
  payment_status TEXT DEFAULT 'pending',
  payment JSONB DEFAULT '{}'::jsonb,
  payment_method TEXT DEFAULT '',
  bank_account JSONB DEFAULT '{}'::jsonb,
  sender_name TEXT DEFAULT '',
  tracking_number TEXT DEFAULT '',
  origin_hub TEXT DEFAULT 'Seoul Hub',
  destination_city TEXT DEFAULT 'Seoul',
  destination_country TEXT DEFAULT 'South Korea',
  shipping_method TEXT DEFAULT 'Standard',
  estimated_delivery TEXT DEFAULT '',
  timeline JSONB DEFAULT '[]'::jsonb,
  parcel_status TEXT DEFAULT '',
  whatsapp_notification_sent BOOLEAN DEFAULT false,
  whatsapp_sent_at BIGINT,
  whatsapp_error TEXT,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- ── CARTS (replaces Firestore 'carts' collection) ─────────────────────────
CREATE TABLE IF NOT EXISTS carts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- ── WISHLISTS (replaces Firestore 'wishlists' collection) ─────────────────
CREATE TABLE IF NOT EXISTS wishlists (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  product_ids TEXT[] DEFAULT '{}',
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- ── CATEGORIES (replaces Firestore 'categories' collection) ───────────────
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  icon TEXT DEFAULT '',
  description TEXT DEFAULT '',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- ── BANNERS (replaces Firestore 'banners' collection) ─────────────────────
CREATE TABLE IF NOT EXISTS banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_url TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT DEFAULT '',
  link_target TEXT DEFAULT '',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- ── REVIEWS (replaces Firestore 'reviews' collection) ─────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL DEFAULT 5,
  text TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  verified_purchase BOOLEAN DEFAULT false,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- ── ADMINS (replaces Firestore 'admins' collection) ───────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- ── SETTINGS (replaces Firestore 'settings' collection) ───────────────────
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- ── PAYMENT VERIFICATION LOGS (audit trail) ───────────────────────────────
CREATE TABLE IF NOT EXISTS payment_verification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID,
  order_number TEXT DEFAULT '',
  action TEXT NOT NULL,
  admin_user_id UUID,
  admin_email TEXT DEFAULT '',
  amount NUMERIC DEFAULT 0,
  customer_name TEXT DEFAULT '',
  reason TEXT DEFAULT '',
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- ── INDEXES ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(available, is_hidden);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_order_id ON payment_verification_logs(order_id);

-- ── DATABASE FUNCTION: Atomic stock decrement ──────────────────────────────
CREATE OR REPLACE FUNCTION public.decrement_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS VOID AS $$
DECLARE
  current_stock INTEGER;
BEGIN
  SELECT stock INTO current_stock FROM products WHERE id = p_product_id FOR UPDATE;
  IF current_stock IS NULL THEN
    RAISE EXCEPTION 'Product % not found', p_product_id;
  END IF;
  IF current_stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock for product %. Available: %, Requested: %', p_product_id, current_stock, p_quantity;
  END IF;
  UPDATE products
  SET stock = GREATEST(0, stock - p_quantity),
      available = CASE WHEN stock - p_quantity > 0 THEN true ELSE false END,
      updated_at = (extract(epoch from now()) * 1000)::bigint
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── DATABASE FUNCTION: Update product rating ───────────────────────────────
CREATE OR REPLACE FUNCTION public.update_product_rating(p_product_id UUID)
RETURNS VOID AS $$
DECLARE
  avg_rating NUMERIC;
  review_count INTEGER;
BEGIN
  SELECT COALESCE(AVG(rating), 0), COUNT(*)
  INTO avg_rating, review_count
  FROM reviews WHERE product_id = p_product_id;

  UPDATE products
  SET rating = ROUND(avg_rating, 1),
      reviews_count = review_count,
      updated_at = (extract(epoch from now()) * 1000)::bigint
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── SEED DEFAULT SETTINGS ──────────────────────────────────────────────────
INSERT INTO settings (key, value, updated_at) VALUES
  ('bankTransfer', '{
    "bankName": "Woori Bank (우리은행)",
    "bankNameKr": "우리은행",
    "accountNumber": "1002364650197",
    "accountHolder": "PARSHANT",
    "instructions": "Transfer the exact amount and upload payment screenshot.",
    "paymentDeadlineHours": 24,
    "enabled": true
  }'::jsonb, (extract(epoch from now()) * 1000)::bigint)
ON CONFLICT (key) DO NOTHING;

-- ── ROW LEVEL SECURITY ─────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_verification_logs ENABLE ROW LEVEL SECURITY;

-- ── PROFILES RLS ───────────────────────────────────────────────────────────
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ── PRODUCTS RLS ───────────────────────────────────────────────────────────
CREATE POLICY "products_select_public" ON products
  FOR SELECT USING (
    is_hidden = false OR
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

CREATE POLICY "products_insert_admin" ON products
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

CREATE POLICY "products_update_admin" ON products
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

CREATE POLICY "products_delete_admin" ON products
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

-- Allow authenticated users to decrement stock (via RPC only, but also direct update for client-side)
CREATE POLICY "products_update_stock" ON products
  FOR UPDATE USING (auth.uid() IS NOT NULL)
  WITH CHECK (stock >= 0);

-- ── ORDERS RLS ─────────────────────────────────────────────────────────────
CREATE POLICY "orders_select_own" ON orders
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

CREATE POLICY "orders_insert_own" ON orders
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR
      user_id IS NULL
    )
  );

CREATE POLICY "orders_update_admin" ON orders
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

CREATE POLICY "orders_update_own_limited" ON orders
  FOR UPDATE USING (
    auth.uid() = user_id AND
    payment_status != 'PAID'
  );

CREATE POLICY "orders_delete_admin" ON orders
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

-- ── CARTS RLS ──────────────────────────────────────────────────────────────
CREATE POLICY "carts_select_own" ON carts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "carts_insert_own" ON carts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "carts_update_own" ON carts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "carts_delete_own" ON carts
  FOR DELETE USING (auth.uid() = user_id);

-- ── WISHLISTS RLS ──────────────────────────────────────────────────────────
CREATE POLICY "wishlists_select_own" ON wishlists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "wishlists_insert_own" ON wishlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wishlists_update_own" ON wishlists
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "wishlists_delete_own" ON wishlists
  FOR DELETE USING (auth.uid() = user_id);

-- ── CATEGORIES RLS ─────────────────────────────────────────────────────────
CREATE POLICY "categories_select_public" ON categories FOR SELECT USING (true);
CREATE POLICY "categories_insert_admin" ON categories
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));
CREATE POLICY "categories_update_admin" ON categories
  FOR UPDATE USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));
CREATE POLICY "categories_delete_admin" ON categories
  FOR DELETE USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));

-- ── BANNERS RLS ────────────────────────────────────────────────────────────
CREATE POLICY "banners_select_public" ON banners FOR SELECT USING (true);
CREATE POLICY "banners_insert_admin" ON banners
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));
CREATE POLICY "banners_update_admin" ON banners
  FOR UPDATE USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));
CREATE POLICY "banners_delete_admin" ON banners
  FOR DELETE USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));

-- ── REVIEWS RLS ────────────────────────────────────────────────────────────
CREATE POLICY "reviews_select_public" ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_own" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_update_own" ON reviews
  FOR UPDATE USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));
CREATE POLICY "reviews_delete_own" ON reviews
  FOR DELETE USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));

-- ── ADMINS RLS ─────────────────────────────────────────────────────────────
CREATE POLICY "admins_select_authenticated" ON admins
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admins_insert_admin" ON admins
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));
CREATE POLICY "admins_delete_admin" ON admins
  FOR DELETE USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));

-- ── SETTINGS RLS ───────────────────────────────────────────────────────────
CREATE POLICY "settings_select_public" ON settings FOR SELECT USING (true);
CREATE POLICY "settings_insert_admin" ON settings
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));
CREATE POLICY "settings_update_admin" ON settings
  FOR UPDATE USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));

-- ── PAYMENT VERIFICATION LOGS RLS ──────────────────────────────────────────
CREATE POLICY "pvl_select_admin" ON payment_verification_logs
  FOR SELECT USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));
CREATE POLICY "pvl_insert_admin" ON payment_verification_logs
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));
-- Immutable: no update or delete policies

-- ── ENABLE REALTIME ────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE carts;
ALTER PUBLICATION supabase_realtime ADD TABLE wishlists;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
ALTER PUBLICATION supabase_realtime ADD TABLE banners;
ALTER PUBLICATION supabase_realtime ADD TABLE settings;
