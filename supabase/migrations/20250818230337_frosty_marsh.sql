-- =========================
-- PawPilot HQ — Bucket Standardization
-- Create underscore buckets, keep legacy hyphen buckets read-only
-- =========================

-- Create/ensure underscore buckets (idempotent)
insert into storage.buckets (id,name,public) values
  ('group_avatars','group_avatars', true),
  ('album_photos','album_photos', true),
  ('lost_found_photos','lost_found_photos', true),
  ('reel_videos','reel_videos', true),
  ('cause_images','cause_images', true),
  ('health_attachments','health_attachments', false)
on conflict (id) do update set public = excluded.public;

-- =========================
-- Policies for PUBLIC buckets (group_avatars, album_photos, lost_found_photos, reel_videos, cause_images)
-- Pattern: public read + auth insert (own folder) + owner update/delete
-- =========================
do $$
declare b text;
begin
  foreach b in array ['group_avatars','album_photos','lost_found_photos','reel_videos','cause_images']
  loop
    -- public read
    if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and polname = initcap(replace(b,'_',' ')) || ': public read') then
      execute format('create policy %L on storage.objects for select using (bucket_id=%L);',
                     initcap(replace(b,'_',' ')) || ': public read', b);
    end if;
    -- auth insert (own folder)
    if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and polname = initcap(replace(b,'_',' ')) || ': auth insert (own folder)') then
      execute format('create policy %L on storage.objects for insert with check (bucket_id=%L and auth.role()=''authenticated'' and split_part(name,''/'',1)=auth.uid()::text);',
                     initcap(replace(b,'_',' ')) || ': auth insert (own folder)', b);
    end if;
    -- owner update
    if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and polname = initcap(replace(b,'_',' ')) || ': owner update') then
      execute format('create policy %L on storage.objects for update using (bucket_id=%L and split_part(name,''/'',1)=auth.uid()::text) with check (bucket_id=%L and split_part(name,''/'',1)=auth.uid()::text);',
                     initcap(replace(b,'_',' ')) || ': owner update', b, b);
    end if;
    -- owner delete
    if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and polname = initcap(replace(b,'_',' ')) || ': owner delete') then
      execute format('create policy %L on storage.objects for delete using (bucket_id=%L and split_part(name,''/'',1)=auth.uid()::text);',
                     initcap(replace(b,'_',' ')) || ': owner delete', b);
    end if;
  end loop;
end$$;

-- =========================
-- Policies for PRIVATE bucket (health_attachments)
-- Pattern: owner select/insert/update/delete (no public read)
-- =========================
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and polname='Health attachments: auth select (own)') then
    create policy "Health attachments: auth select (own)"
      on storage.objects for select
      using (bucket_id='health_attachments' and split_part(name,'/',1)=auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and polname='Health attachments: auth insert (own folder)') then
    create policy "Health attachments: auth insert (own folder)"
      on storage.objects for insert
      with check (bucket_id='health_attachments' and auth.role()='authenticated' and split_part(name,'/',1)=auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and polname='Health attachments: owner update') then
    create policy "Health attachments: owner update"
      on storage.objects for update
      using (bucket_id='health_attachments' and split_part(name,'/',1)=auth.uid()::text)
      with check (bucket_id='health_attachments' and split_part(name,'/',1)=auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and polname='Health attachments: owner delete') then
    create policy "Health attachments: owner delete"
      on storage.objects for delete
      using (bucket_id='health_attachments' and split_part(name,'/',1)=auth.uid()::text);
  end if;
end$$;

-- =========================
-- Freeze legacy hyphen buckets to READ-ONLY (keep SELECT, drop INSERT/UPDATE/DELETE)
-- Buckets: group-avatars, album-photos, lost-found-photos, reel-videos, cause-images
-- =========================
do $$
declare r record;
begin
  for r in
    select polname from pg_policies
    where schemaname='storage' and tablename='objects'
      and cmd in ('INSERT','UPDATE','DELETE')
      and (
        qual ilike '%bucket_id = ''group-avatars''%'
        or qual ilike '%bucket_id = ''album-photos''%'
        or qual ilike '%bucket_id = ''lost-found-photos''%'
        or qual ilike '%bucket_id = ''reel-videos''%'
        or qual ilike '%bucket_id = ''cause-images''%'
        or coalesce(with_check,'') ilike '%bucket_id = ''group-avatars''%'
        or coalesce(with_check,'') ilike '%bucket_id = ''album-photos''%'
        or coalesce(with_check,'') ilike '%bucket_id = ''lost-found-photos''%'
        or coalesce(with_check,'') ilike '%bucket_id = ''reel-videos''%'
        or coalesce(with_check,'') ilike '%bucket_id = ''cause-images''%'
      )
  loop
    execute format('drop policy if exists %I on storage.objects;', r.polname);
  end loop;
end$$;

-- Ensure one public-read SELECT per legacy bucket
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and polname='Group avatars (legacy): public read') then
    create policy "Group avatars (legacy): public read" on storage.objects for select using (bucket_id='group-avatars');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and polname='Album photos (legacy): public read') then
    create policy "Album photos (legacy): public read" on storage.objects for select using (bucket_id='album-photos');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and polname='Lost & found (legacy): public read') then
    create policy "Lost & found (legacy): public read" on storage.objects for select using (bucket_id='lost-found-photos');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and polname='Reel videos (legacy): public read') then
    create policy "Reel videos (legacy): public read" on storage.objects for select using (bucket_id='reel-videos');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and polname='Cause images (legacy): public read') then
    create policy "Cause images (legacy): public read" on storage.objects for select using (bucket_id='cause-images');
  end if;
end$$;

-- =========================
-- Verify
-- =========================
-- Run this query after migration to verify:
-- with p as (
--   select polname, cmd, qual, with_check from pg_policies
--   where schemaname='storage' and tablename='objects'
-- )
-- select
--   case
--     when qual like '%bucket_id = ''group_avatars''%' then 'group_avatars'
--     when qual like '%bucket_id = ''album_photos''%' then 'album_photos'
--     when qual like '%bucket_id = ''lost_found_photos''%' then 'lost_found_photos'
--     when qual like '%bucket_id = ''reel_videos''%' then 'reel_videos'
--     when qual like '%bucket_id = ''cause_images''%' then 'cause_images'
--     when qual like '%bucket_id = ''health_attachments''%' then 'health_attachments'
--     when qual like '%bucket_id = ''group-avatars''%' then 'group-avatars (legacy)'
--     when qual like '%bucket_id = ''album-photos''%' then 'album-photos (legacy)'
--     when qual like '%bucket_id = ''lost-found-photos''%' then 'lost-found-photos (legacy)'
--     when qual like '%bucket_id = ''reel-videos''%' then 'reel-videos (legacy)'
--     when qual like '%bucket_id = ''cause-images''%' then 'cause-images (legacy)'
--     else 'other'
--   end as bucket, polname, cmd
-- from p
-- order by bucket, polname, cmd;