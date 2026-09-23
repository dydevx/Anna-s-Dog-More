insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('product-images', 'product-images', true, 8388608, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "public reads product images storage"
on storage.objects for select to anon, authenticated
using (bucket_id = 'product-images');

-- Uploads intentionally have no browser policy. Admin uploads pass through a
-- server-authorized endpoint where images are resized before storage.
