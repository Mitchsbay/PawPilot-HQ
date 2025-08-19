-- =========================================================
-- PawPilot HQ — Idempotent Storage Buckets & Policies
-- Buckets: avatars, pet_photos, post_media
-- Security:
--   - Public read
--   - Authenticated insert (first folder = auth.uid())
--   - Owner update/delete (same rule)
-- Naming: "<BucketName>: <action description>"
-- =========================================================

-- NOTE: Run this in Supabase SQL Editor or via `supabase db push`
-- as an admin/owner role. Do not run from your application.

-- 1) Ensure buckets exist (idempotent)
insert into storage.buckets (id, name, public)
values ('avatars','avatars', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('pet_photos','pet_photos', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('post_media','post_media', true)
on conflict (id) do update set public = excluded.public;

-- Helper for ownership by path:
-- (storage.foldername(name))[1] = auth.uid()::text

-- 2) Policies for AVATARS
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and polname='Avatars: public read'
  ) then
    execute $ddl$
      create policy "Avatars: public read"
      on storage.objects
      for select
      using (bucket_id = 'avatars')
    $ddl$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and polname='Avatars: auth insert (own folder)'
  ) then
    execute $ddl$
      create policy "Avatars: auth insert (own folder)"
      on storage.objects
      for insert
      with check (
        bucket_id = 'avatars'
        and auth.role() = 'authenticated'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
    $ddl$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and polname='Avatars: owner update'
  ) then
    execute $ddl$
      create policy "Avatars: owner update"
      on storage.objects
      for update
      using (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
      with check (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
    $ddl$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and polname='Avatars: owner delete'
  ) then
    execute $ddl$
      create policy "Avatars: owner delete"
      on storage.objects
      for delete
      using (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
    $ddl$;
  end if;
end$$;

-- 3) Policies for PET_PHOTOS
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and polname='Pet photos: public read'
  ) then
    execute $ddl$
      create policy "Pet photos: public read"
      on storage.objects
      for select
      using (bucket_id = 'pet_photos')
    $ddl$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and polname='Pet photos: auth insert (own folder)'
  ) then
    execute $ddl$
      create policy "Pet photos: auth insert (own folder)"
      on storage.objects
      for insert
      with check (
        bucket_id = 'pet_photos'
        and auth.role() = 'authenticated'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
    $ddl$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and polname='Pet photos: owner update'
  ) then
    execute $ddl$
      create policy "Pet photos: owner update"
      on storage.objects
      for update
      using (
        bucket_id = 'pet_photos'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
      with check (
        bucket_id = 'pet_photos'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
    $ddl$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and polname='Pet photos: owner delete'
  ) then
    execute $ddl$
      create policy "Pet photos: owner delete"
      on storage.objects
      for delete
      using (
        bucket_id = 'pet_photos'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
    $ddl$;
  end if;
end$$;

-- 4) Policies for POST_MEDIA
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and polname='Post media: public read'
  ) then
    execute $ddl$
      create policy "Post media: public read"
      on storage.objects
      for select
      using (bucket_id = 'post_media')
    $ddl$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and polname='Post media: auth insert (own folder)'
  ) then
    execute $ddl$
      create policy "Post media: auth insert (own folder)"
      on storage.objects
      for insert
      with check (
        bucket_id = 'post_media'
        and auth.role() = 'authenticated'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
    $ddl$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and polname='Post media: owner update'
  ) then
    execute $ddl$
      create policy "Post media: owner update"
      on storage.objects
      for update
      using (
        bucket_id = 'post_media'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
      with check (
        bucket_id = 'post_media'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
    $ddl$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and polname='Post media: owner delete'
  ) then
    execute $ddl$
      create policy "Post media: owner delete"
      on storage.objects
      for delete
      using (
        bucket_id = 'post_media'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
    $ddl$;
  end if;
end$$;

-- 5) (Optional) Inspect ownership if curious:
-- select r.rolname as owner
-- from pg_class c
-- join pg_namespace n on n.oid = c.relnamespace
-- join pg_roles r on r.oid = c.relowner
-- where n.nspname='storage' and c.relname='objects';