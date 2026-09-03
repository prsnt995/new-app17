import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const supabase = createClient(url, key);

async function fetchAsBlob(firebaseUrl) {
  const res = await fetch(firebaseUrl);
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  return await res.blob();
}

let backfilled = 0, skipped = 0, failed = 0;
const { data: products, error } = await supabase.from('products').select('id, images, image, image_url').limit(100);
if (error) throw error;

for (const p of products) {
  const img = p.image || p.image_url || (Array.isArray(p.images) ? p.images[0] : null);
  if (!img || !img.includes('firebasestorage.googleapis.com')) { skipped++; continue; }
  try {
    const blob = await fetchAsBlob(img);
    if (blob.size > 5*1024*1024) { console.warn(`skip large ${p.id}`); skipped++; continue; }
    const path = `products/${p.id}/${Date.now()}_backfill.jpg`;
    const { error: upErr } = await supabase.storage.from('products').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
    if (upErr) throw upErr;
    const { data: signed } = await supabase.storage.from('products').createSignedUrl(path, 60*60*24*30);
    const newUrl = signed?.signedUrl || img;
    await supabase.from('products').update({ image: newUrl, image_url: newUrl, images: [newUrl] }).eq('id', p.id);
    backfilled++;
    console.log(`backfilled ${p.id}`);
  } catch (e) { failed++; console.error(`failed ${p.id}:`, e.message); }
}
console.log(`Done — backfilled: ${backfilled}, skipped: ${skipped}, failed: ${failed}`);
