-- Storage policies for `kittypau-photos`
-- Goal: allow authenticated users to upload/update/delete their own objects,
-- while keeping the bucket readable (public bucket).

-- IMPORTANTE:
-- En Supabase, `storage.objects` no suele estar "owned" por `postgres`, por lo que
-- estas policies normalmente NO se pueden aplicar vÃ­a `supabase db push`.
-- RecomendaciÃ³n: configurar desde Dashboard -> Storage -> Policies (UI).
-- Este archivo es referencia de las expresiones a usar.

-- Idempotent policy reset (created previously via dashboard).
drop policy if exists "photos_select" on storage.objects;
drop policy if exists "photos_insert_auth" on storage.objects;
drop policy if exists "kittypau_photos_select_public" on storage.objects;
drop policy if exists "kittypau_photos_insert_own" on storage.objects;
drop policy if exists "kittypau_photos_update_own" on storage.objects;
drop policy if exists "kittypau_photos_delete_own" on storage.objects;

-- Public read (listing / metadata) for this bucket.
create policy "kittypau_photos_select_public"
on storage.objects
for select
using (bucket_id = 'kittypau-photos');

-- Authenticated upload to this bucket (objects will have owner = auth.uid()).
create policy "kittypau_photos_insert_own"
on storage.objects
for insert
with check (
  bucket_id = 'kittypau-photos'
  and auth.role() = 'authenticated'
  and owner = auth.uid()
);

-- Allow owners to modify/delete their own objects.
create policy "kittypau_photos_update_own"
on storage.objects
for update
using (
  bucket_id = 'kittypau-photos'
  and auth.role() = 'authenticated'
  and owner = auth.uid()
);

create policy "kittypau_photos_delete_own"
on storage.objects
for delete
using (
  bucket_id = 'kittypau-photos'
  and auth.role() = 'authenticated'
  and owner = auth.uid()
);
