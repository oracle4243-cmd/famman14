insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-images',
  'site-images',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Site images are publicly readable" on storage.objects;
create policy "Site images are publicly readable"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'site-images');

drop policy if exists "Admins can upload site images" on storage.objects;
create policy "Admins can upload site images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'site-images'
  and public.is_site_admin(auth.uid())
);

drop policy if exists "Admins can update site images" on storage.objects;
create policy "Admins can update site images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'site-images'
  and public.is_site_admin(auth.uid())
)
with check (
  bucket_id = 'site-images'
  and public.is_site_admin(auth.uid())
);

drop policy if exists "Admins can delete site images" on storage.objects;
create policy "Admins can delete site images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'site-images'
  and public.is_site_admin(auth.uid())
);
