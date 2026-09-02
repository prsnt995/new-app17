-- Fix: Add missing columns to products table that the app expects
ALTER TABLE products ADD COLUMN IF NOT EXISTS image TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_best_seller BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS date TEXT DEFAULT '';

-- Helper functions that bypass RLS (SECURITY DEFINER) to avoid 42P17 recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin_or_empty()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
      OR NOT EXISTS (SELECT 1 FROM public.admins);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Fix RLS: prevent role escalation and admin enumeration
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "admins_select_authenticated" ON admins;
DROP POLICY IF EXISTS "admins_select_admin" ON admins;
CREATE POLICY "admins_select_admin" ON admins
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "admins_insert_admin" ON admins;
CREATE POLICY "admins_insert_admin" ON admins
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND public.is_admin_or_empty()
  );

-- Also fix products select for anon (avoid recursion through admins check)
DROP POLICY IF EXISTS "products_select_public" ON products;
CREATE POLICY "products_select_public" ON products
  FOR SELECT USING (
    is_hidden = false OR public.is_admin()
  );

DROP POLICY IF EXISTS "products_insert_admin" ON products;
CREATE POLICY "products_insert_admin" ON products
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "products_update_admin" ON products;
CREATE POLICY "products_update_admin" ON products
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "products_delete_admin" ON products;
CREATE POLICY "products_delete_admin" ON products
  FOR DELETE USING (public.is_admin());
