-- =====================================================================
--  FAMILY CALENDAR  ·  Supabase setup
--  Paste this WHOLE file into Supabase  ->  SQL Editor  ->  New query
--  then press RUN.  It creates the tables, the security rules, the
--  live-sync, and the photo/video storage.  Safe to run once.
-- =====================================================================

-- 1) EVENTS -----------------------------------------------------------
create table if not exists public.events (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id),
  title           text not null,
  category        text,
  color           text,                       -- e.g. '#0A84FF'
  who             text[] default '{}',         -- e.g. {'Lincoln','Evelyn'}
  event_type      text not null default 'one_off',  -- one_off | weekly | daily | monthly
  event_date      date,                        -- used by one_off
  weekday         int,                         -- 0=Sun .. 6=Sat (weekly)
  month_day       int,                         -- 1..31 (monthly)
  is_all_day      boolean not null default true,
  start_time      time,                        -- null when all-day
  location_name   text,
  location_address text,
  lat             double precision,
  lng             double precision,
  prep_items      text,
  helper          text,                        -- 'Sam' | 'Meeah' | ...
  helper_role     text,                        -- 'pickup' | 'dropoff' | 'both'
  cost            text,
  notes           text,
  priority_order  int not null default 0,
  recurrence_end  date
);

alter table public.events enable row level security;

create policy "Family read events"   on public.events for select using (auth.uid() is not null);
create policy "Family insert events"  on public.events for insert with check (auth.uid() is not null);
create policy "Family update events"  on public.events for update using (auth.uid() is not null);
create policy "Family delete events"  on public.events for delete using (auth.uid() is not null);

-- 2) ATTACHMENTS (links events to photos/videos) ----------------------
create table if not exists public.attachments (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  event_id    uuid references public.events(id) on delete cascade,
  file_path   text not null,
  file_type   text,                            -- 'image' | 'video'
  uploaded_by uuid references auth.users(id)
);

alter table public.attachments enable row level security;

create policy "Family read attach"   on public.attachments for select using (auth.uid() is not null);
create policy "Family insert attach"  on public.attachments for insert with check (auth.uid() is not null);
create policy "Family delete attach"  on public.attachments for delete using (auth.uid() is not null);

-- 3) LIVE SYNC across devices -----------------------------------------
--  (if this line ever says "already a member of publication", ignore it)
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.attachments;

-- 4) PHOTO / VIDEO STORAGE --------------------------------------------
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy "Family read files"   on storage.objects for select
  using (bucket_id = 'attachments' and auth.uid() is not null);
create policy "Family upload files" on storage.objects for insert
  with check (bucket_id = 'attachments' and auth.uid() is not null);
create policy "Family delete files" on storage.objects for delete
  using (bucket_id = 'attachments' and auth.uid() is not null);

-- Done.  You should see "Success. No rows returned".
