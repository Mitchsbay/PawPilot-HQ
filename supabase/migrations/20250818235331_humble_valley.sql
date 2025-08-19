-- PawPilot HQ — Consolidated Migration (Flags, Telemetry, Payments, Push, AI, Gamification, Metrics)
-- Run via Supabase SQL editor or `supabase db push` (owner/admin). Safe to re-run.

-- Roles table (for admin gating)
create table if not exists public.user_roles(
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('user','admin','super_admin')) default 'user',
  updated_at timestamptz not null default now()
);
alter table public.user_roles enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname='user_roles: owner read') then
    create policy "user_roles: owner read" on public.user_roles for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname='user_roles: admins write') then
    create policy "user_roles: admins write" on public.user_roles
      for all using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin','super_admin')))
             with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin','super_admin')));
  end if;
end $$;

-- Feature flags
create table if not exists public.feature_flags (
  key text primary key,
  is_enabled boolean not null default false,
  rollout jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.feature_flags enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname='flags readable') then
    create policy "flags readable" on public.feature_flags for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname='flags admin write') then
    create policy "flags admin write" on public.feature_flags
      for all using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin','super_admin')))
             with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin','super_admin')));
  end if;
end $$;

-- Telemetry
create table if not exists public.event_log(
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists event_log_user_created_idx on public.event_log(user_id, created_at desc);
alter table public.event_log enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname='events: owner write') then
    create policy "events: owner write" on public.event_log for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname='events: admin read') then
    create policy "events: admin read" on public.event_log for select
      using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin','super_admin')));
  end if;
end $$;

-- Stripe
create table if not exists public.stripe_customers(
  user_id uuid primary key references auth.users(id) on delete cascade,
  customer_id text unique not null
);
alter table public.stripe_customers enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname='stripe_customer: owner read') then
    create policy "stripe_customer: owner read" on public.stripe_customers for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname='stripe_customer: owner upsert') then
    create policy "stripe_customer: owner upsert" on public.stripe_customers for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname='stripe_customer: owner update') then
    create policy "stripe_customer: owner update" on public.stripe_customers for update
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

create table if not exists public.subscriptions(
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null,
  price_id text not null,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists subs_user_idx on public.subscriptions(user_id);
alter table public.subscriptions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname='subs owner read') then
    create policy "subs owner read" on public.subscriptions for select using (auth.uid() = user_id);
  end if;
end $$;

-- Push tokens
create table if not exists public.push_tokens(
  user_id uuid references auth.users(id) on delete cascade,
  token text primary key,
  platform text not null check (platform in ('web','mobile')),
  created_at timestamptz not null default now()
);
alter table public.push_tokens enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname='push tokens owner rw') then
    create policy "push tokens owner rw" on public.push_tokens
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- AI predictions
create table if not exists public.ai_predictions(
  id bigserial primary key,
  user_id uuid references auth.users(id),
  subject_type text not null check (subject_type in ('photo','post_media','health')),
  subject_bucket text not null,
  subject_path text not null,
  model text not null,
  labels jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_preds_user_created_idx on public.ai_predictions(user_id, created_at desc);
alter table public.ai_predictions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname='ai_predictions owner rw') then
    create policy "ai_predictions owner rw" on public.ai_predictions
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- Gamification
create table if not exists public.achievements(
  key text primary key,
  title text not null,
  description text,
  points int not null default 10
);
alter table public.achievements enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname='achievements readable') then
    create policy "achievements readable" on public.achievements for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname='achievements admin write') then
    create policy "achievements admin write" on public.achievements
      for all using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin','super_admin')))
             with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin','super_admin')));
  end if;
end $$;

create table if not exists public.user_achievements(
  user_id uuid references auth.users(id) on delete cascade,
  key text references public.achievements(key),
  achieved_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.user_achievements enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname='user_achievements owner rw') then
    create policy "user_achievements owner rw" on public.user_achievements
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- Metrics MV + refresh helper
create materialized view if not exists public.mv_daily_metrics as
select date_trunc('day', created_at) as d, name, count(*) as cnt
from public.event_log
group by 1,2;

create or replace function public.refresh_mv_daily_metrics() returns void
language sql security definer as $$ refresh materialized view concurrently public.mv_daily_metrics; $$;

-- Seed flags
insert into public.feature_flags (key, is_enabled, rollout) values
  ('payments_billing', false, '{}'::jsonb),
  ('donations_checkout', false, '{}'::jsonb),
  ('offline_mode', false, '{}'::jsonb),
  ('ai_autotag', false, '{}'::jsonb),
  ('gamification_v1', false, '{}'::jsonb)
on conflict (key) do nothing;

-- Seed achievements
insert into public.achievements (key, title, description, points) values
  ('first_pet', 'First Pet Added', 'Added your first pet to PawPilot HQ', 10),
  ('first_post', 'First Post', 'Shared your first post with the community', 10),
  ('health_tracker', 'Health Tracker', 'Logged 5 health records', 25),
  ('social_butterfly', 'Social Butterfly', 'Made 10 connections', 50),
  ('pet_photographer', 'Pet Photographer', 'Uploaded 25 photos', 30),
  ('community_helper', 'Community Helper', 'Helped with 3 lost pet reports', 75),
  ('early_adopter', 'Early Adopter', 'Joined PawPilot HQ in the first month', 100)
on conflict (key) do nothing;