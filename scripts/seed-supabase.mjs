import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import vm from 'vm';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in your environment or server/.env');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function seed() {
  const content = fs.readFileSync(new URL('../src/data/mockData.ts', import.meta.url), 'utf8');
  const match = content.match(/export const INITIAL_PRODUCTS[^=]*=\s*(\[[\s\S]*?\]);[\s\S]*?export const CLOTHING_CATEGORIES/);
  if (!match) throw new Error('Could not find INITIAL_PRODUCTS');
  const products = vm.runInNewContext('(' + match[1] + ')');

  const { count: existingCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
  if (existingCount > 0) {
    console.log(`Products already seeded: ${existingCount} rows. Skipping. Use --force to re-seed.`);
    if (!process.argv.includes('--force')) return;
    console.log('Force re-seed: clearing products...');
    await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  const rows = products.map(p => {
    const discountPercent = parseInt((p.discount || '').replace(/[^0-9]/g, '')) || 0;
    const finalPrice = discountPercent > 0 ? Math.round(p.priceKRW * (1 - discountPercent / 100)) : p.priceKRW;
    return {
      name: p.name, category: p.category || 'All', description: p.description || '',
      price_krw: p.priceKRW || 0, old_price_krw: p.oldPriceKRW || 0,
      discount_percent: discountPercent, final_price: finalPrice,
      stock: 50, available: true, is_hidden: false,
      images: p.image ? [p.image] : [], keywords: p.keywords || {},
      weight_kg: p.weightKg || 0.5, size: p.size || '', origin: p.origin || '',
      rating: p.rating || 0, reviews_count: p.reviews || 0,
    };
  });

  const { data, error } = await supabase.from('products').insert(rows).select('id');
  if (error) throw error;
  console.log(`Seeded ${data.length} products`);

  // Categories
  const { data: catExists } = await supabase.from('categories').select('id').limit(1);
  if (!catExists?.length) {
    const cats = [
      { name: 'All', icon: '✨', description: '', display_order: 0, is_active: true },
      { name: 'Rice', icon: '🍚', description: 'Basmati & Sona', display_order: 1, is_active: true },
      { name: 'Atta', icon: '🌾', description: 'Chakki Fresh', display_order: 2, is_active: true },
      { name: 'Masala', icon: '🌶️', description: 'Spices & Herbs', display_order: 3, is_active: true },
      { name: 'Dal', icon: '🫘', description: 'Pulses & Lentils', display_order: 4, is_active: true },
      { name: 'Snacks', icon: '🍿', description: 'Namkeen & Chips', display_order: 5, is_active: true },
      { name: 'Drinks', icon: '🥤', description: 'Tea & Beverages', display_order: 6, is_active: true },
      { name: 'Sweets', icon: '🍬', description: 'Mithai & Desserts', display_order: 7, is_active: true },
      { name: 'Noodles', icon: '🍜', description: 'Instant & Fresh', display_order: 8, is_active: true },
      { name: 'Festival', icon: '🪔', description: 'Festival Specials', display_order: 9, is_active: true },
      { name: 'Jewelry', icon: '💎', description: 'Gold & Kundan', display_order: 10, is_active: true },
      { name: 'Clothes', icon: '👗', description: 'Sarees & Apparel', display_order: 11, is_active: true },
      { name: 'Perfumes', icon: '🧴', description: 'Attar & Cologne', display_order: 12, is_active: true },
    ];
    const { error: catErr } = await supabase.from('categories').insert(cats);
    console.log(catErr ? 'Categories fail: ' + catErr.message : `Seeded ${cats.length} categories`);
  }

  // Banners
  const { data: bannerExists } = await supabase.from('banners').select('id').limit(1);
  if (!bannerExists?.length) {
    const banners = [
      { image_url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200', title: '🎉 Festival Season Sale', subtitle: 'Up to 30% off on all Indian groceries', link_target: 'Masala', display_order: 0, is_active: true },
      { image_url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=1200', title: '✈️ Express Delivery to India & Nepal', subtitle: 'Seoul → New Delhi in 3-5 days', link_target: 'Rice', display_order: 1, is_active: true },
      { image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=1200', title: '🍚 Premium Basmati Collection', subtitle: 'Authentic Himalayan & Indian rice', link_target: 'Rice', display_order: 2, is_active: true },
    ];
    const { error: banErr } = await supabase.from('banners').insert(banners);
    console.log(banErr ? 'Banners fail: ' + banErr.message : `Seeded ${banners.length} banners`);
  }

  console.log('Done. All mock data is now in Supabase. App will load from Supabase on next refresh.');
}

seed().catch(e => { console.error(e); process.exit(1); });
