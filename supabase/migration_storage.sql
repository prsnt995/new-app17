-- Supabase Storage: buckets + private RLS (run in Supabase SQL Editor)
insert into storage.buckets (id, name, public) values ('products','products',false) on conflict (id) do update set public = false;
insert into storage.buckets (id, name, public) values ('payment-proofs','payment-proofs',false) on conflict (id) do update set public = false;

-- Products bucket: private read — admin or authenticated (catalog requires signed URL per image)
do $$ begin
  drop policy if exists "products public read" on storage.objects;
  drop policy if exists "products private read" on storage.objects;
  drop policy if exists "products private read admin or auth" on storage.objects;
exception when others then null; end $$;

create policy "products private read" on storage.objects for select
  using (bucket_id='products' and (public.is_admin() or auth.role() = 'authenticated'));
create policy "products admin insert" on storage.objects for insert
  with check (bucket_id='products' and public.is_admin());
create policy "products admin update" on storage.objects for update
  using (bucket_id='products' and public.is_admin());
create policy "products admin delete" on storage.objects for delete
  using (bucket_id='products' and public.is_admin());

-- Payment-proofs: private — admin or owner (first path segment == uid)
do $$ begin
  drop policy if exists "payment proofs read" on storage.objects;
  drop policy if exists "payment proofs admin or owner read" on storage.objects;
  drop policy if exists "payment proofs write" on storage.objects;
  drop policy if exists "payment proofs owner write" on storage.objects;
  drop policy if exists "payment proofs owner delete" on storage.objects;
exception when others then null; end $$;

create policy "payment proofs admin or owner read" on storage.objects for select
  using (bucket_id='payment-proofs' and (public.is_admin() or auth.uid()::text = (storage.foldername(name))[1]));
create policy "payment proofs owner write" on storage.objects for insert
  with check (bucket_id='payment-proofs' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "payment proofs owner delete" on storage.objects for delete
  using (bucket_id='payment-proofs' and (public.is_admin() or auth.uid()::text = (storage.foldername(name))[1]));
