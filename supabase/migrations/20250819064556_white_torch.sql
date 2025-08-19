/*
  # Fix Storage Policies - Correct Column Names

  This migration fixes the storage policy creation by using the correct
  column name 'policyname' instead of 'polname' in pg_policies table.

  1. Storage Buckets
     - Creates all required storage buckets with proper naming
     - Ensures idempotent bucket creation

  2. Storage Policies
     - Public read access for public content buckets
     - Authenticated insert with path-based ownership
     - Owner-only update/delete permissions
     - Private bucket access for health attachments

  3. Security
     - Path-based ownership: {user_id}/filename
     - Proper RLS enforcement
     - No privilege checks that cause errors
*/

-- Create storage buckets (idempotent)
insert into storage.buckets (id, name, public)
values 
  ('avatars', 'avatars', true),
  ('pet_photos', 'pet_photos', true),
  ('post_media', 'post_media', true),
  ('group_avatars', 'group_avatars', true),
  ('album_photos', 'album_photos', true),
  ('lost_found_photos', 'lost_found_photos', true),
  ('reel_videos', 'reel_videos', true),
  ('cause_images', 'cause_images', true),
  ('health_attachments', 'health_attachments', false),
  ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Storage policies for avatars bucket
do $$
begin
  -- public read
  if not exists (
    select 1 from pg_policies
    where schemaname='storage'
      and tablename='objects'
      and policyname='Avatars: public read'
  ) then
    execute $ddl$
      create policy "Avatars: public read"
      on storage.objects
      for select
      using (bucket_id = 'avatars')
    $ddl$;
  end if;

  -- auth insert (own folder)
  if not exists (
    select 1 from pg_policies
    where schemaname='storage'
      and tablename='objects'
      and policyname='Avatars: auth insert (own folder)'
  ) then
    execute $ddl$
      create policy "Avatars: auth insert (own folder)"
      on storage.objects
      for insert
      with check (
        bucket_id = 'avatars'
        and auth.role() = 'authenticated'
        and split_part(name, '/', 1) = auth.uid()::text
      )
    $ddl$;
  end if;

  -- owner update
  if not exists (
    select 1 from pg_policies
    where schemaname='storage'
      and tablename='objects'
      and policyname='Avatars: owner update'
  ) then
    execute $ddl$
      create policy "Avatars: owner update"
      on storage.objects
      for update
      using (
        bucket_id = 'avatars'
        and split_part(name, '/', 1) = auth.uid()::text
      )
      with check (
        bucket_id = 'avatars'
        and split_part(name, '/', 1) = auth.uid()::text
      )
    $ddl$;
  end if;

  -- owner delete
  if not exists (
    select 1 from pg_policies
    where schemaname='storage'
      and tablename='objects'
      and policyname='Avatars: owner delete'
  ) then
    execute $ddl$
      create policy "Avatars: owner delete"
      on storage.objects
      for delete
      using (
        bucket_id = 'avatars'
        and split_part(name, '/', 1) = auth.uid()::text
      )
    $ddl$;
  end if;
end$$;

-- Storage policies for pet_photos bucket
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage'
      and tablename='objects'
      and policyname='Pet photos: public read'
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
    where schemaname='storage'
      and tablename='objects'
      and policyname='Pet photos: auth insert (own folder)'
  ) then
    execute $ddl$
      create policy "Pet photos: auth insert (own folder)"
      on storage.objects
      for insert
      with check (
        bucket_id = 'pet_photos'
        and auth.role() = 'authenticated'
        and split_part(name, '/', 1) = auth.uid()::text
      )
    $ddl$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage'
      and tablename='objects'
      and policyname='Pet photos: owner update'
  ) then
    execute $ddl$
      create policy "Pet photos: owner update"
      on storage.objects
      for update
      using (
        bucket_id = 'pet_photos'
        and split_part(name, '/', 1) = auth.uid()::text
      )
      with check (
        bucket_id = 'pet_photos'
        and split_part(name, '/', 1) = auth.uid()::text
      )
    $ddl$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage'
      and tablename='objects'
      and policyname='Pet photos: owner delete'
  ) then
    execute $ddl$
      create policy "Pet photos: owner delete"
      on storage.objects
      for delete
      using (
        bucket_id = 'pet_photos'
        and split_part(name, '/', 1) = auth.uid()::text
      )
    $ddl$;
  end if;
end$$;

-- Storage policies for post_media bucket
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage'
      and tablename='objects'
      and policyname='Post media: public read'
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
    where schemaname='storage'
      and tablename='objects'
      and policyname='Post media: auth insert (own folder)'
  ) then
    execute $ddl$
      create policy "Post media: auth insert (own folder)"
      on storage.objects
      for insert
      with check (
        bucket_id = 'post_media'
        and auth.role() = 'authenticated'
        and split_part(name, '/', 1) = auth.uid()::text
      )
    $ddl$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage'
      and tablename='objects'
      and policyname='Post media: owner update'
  ) then
    execute $ddl$
      create policy "Post media: owner update"
      on storage.objects
      for update
      using (
        bucket_id = 'post_media'
        and split_part(name, '/', 1) = auth.uid()::text
      )
      with check (
        bucket_id = 'post_media'
        and split_part(name, '/', 1) = auth.uid()::text
      )
    $ddl$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage'
      and tablename='objects'
      and policyname='Post media: owner delete'
  ) then
    execute $ddl$
      create policy "Post media: owner delete"
      on storage.objects
      for delete
      using (
        bucket_id = 'post_media'
        and split_part(name, '/', 1) = auth.uid()::text
      )
    $ddl$;
  end if;
end$$;

-- Storage policies for health_attachments bucket (private)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage'
      and tablename='objects'
      and policyname='Health attachments: owner only'
  ) then
    execute $ddl$
      create policy "Health attachments: owner only"
      on storage.objects
      for all
      using (
        bucket_id = 'health_attachments'
        and split_part(name, '/', 1) = auth.uid()::text
      )
      with check (
        bucket_id = 'health_attachments'
        and auth.role() = 'authenticated'
        and split_part(name, '/', 1) = auth.uid()::text
      )
    $ddl$;
  end if;
end$$;

-- Storage policies for remaining public buckets
do $$
declare
  bucket_name text;
  policy_prefix text;
begin
  for bucket_name, policy_prefix in values 
    ('group_avatars', 'Group avatars'),
    ('album_photos', 'Album photos'),
    ('lost_found_photos', 'Lost found photos'),
    ('reel_videos', 'Reel videos'),
    ('cause_images', 'Cause images'),
    ('attachments', 'Message attachments')
  loop
    -- public read (except attachments which are private)
    if bucket_name != 'attachments' then
      if not exists (
        select 1 from pg_policies
        where schemaname='storage'
          and tablename='objects'
          and policyname=policy_prefix || ': public read'
      ) then
        execute format($ddl$
          create policy %L
          on storage.objects
          for select
          using (bucket_id = %L)
        $ddl$, policy_prefix || ': public read', bucket_name);
      end if;
    end if;

    -- auth insert (own folder)
    if not exists (
      select 1 from pg_policies
      where schemaname='storage'
        and tablename='objects'
        and policyname=policy_prefix || ': auth insert (own folder)'
    ) then
      execute format($ddl$
        create policy %L
        on storage.objects
        for insert
        with check (
          bucket_id = %L
          and auth.role() = 'authenticated'
          and split_part(name, '/', 1) = auth.uid()::text
        )
      $ddl$, policy_prefix || ': auth insert (own folder)', bucket_name);
    end if;

    -- owner update
    if not exists (
      select 1 from pg_policies
      where schemaname='storage'
        and tablename='objects'
        and policyname=policy_prefix || ': owner update'
    ) then
      execute format($ddl$
        create policy %L
        on storage.objects
        for update
        using (
          bucket_id = %L
          and split_part(name, '/', 1) = auth.uid()::text
        )
        with check (
          bucket_id = %L
          and split_part(name, '/', 1) = auth.uid()::text
        )
      $ddl$, policy_prefix || ': owner update', bucket_name, bucket_name);
    end if;

    -- owner delete
    if not exists (
      select 1 from pg_policies
      where schemaname='storage'
        and tablename='objects'
        and policyname=policy_prefix || ': owner delete'
    ) then
      execute format($ddl$
        create policy %L
        on storage.objects
        for delete
        using (
          bucket_id = %L
          and split_part(name, '/', 1) = auth.uid()::text
        )
      $ddl$, policy_prefix || ': owner delete', bucket_name);
    end if;
  end loop;
end$$;

-- Verification query (run this to confirm policies were created)
-- select policyname, cmd, bucket_id
-- from pg_policies p
-- join (select unnest(string_to_array(qual, '''')) as bucket_id from pg_policies where schemaname='storage' limit 1) b on true
-- where schemaname='storage' and tablename='objects'
-- order by policyname, cmd;