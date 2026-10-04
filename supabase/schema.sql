-- ============================================================
-- Ders Notlarım · Supabase şeması
-- Kurulum: Supabase Dashboard > SQL Editor > New query,
-- bu dosyanın tamamını yapıştırıp "Run" düğmesine basın.
-- ============================================================

create extension if not exists pgcrypto;

-- Dersler -----------------------------------------------------
create table if not exists public.courses (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  color      text not null default '#6366f1',
  created_at timestamptz not null default now()
);

-- Derslerin altındaki konular --------------------------------
create table if not exists public.topics (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references public.courses (id) on delete cascade,
  title      text not null,
  created_at timestamptz not null default now()
);

-- Konuların altındaki notlar ----------------------------------
create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  topic_id   uuid not null references public.topics (id) on delete cascade,
  content    text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists topics_course_id_idx on public.topics (course_id);
create index if not exists notes_topic_id_idx   on public.notes (topic_id);
create index if not exists notes_updated_at_idx on public.notes (updated_at desc);

-- Row Level Security ------------------------------------------
-- Uygulama anon key ile (giriş yapmadan) çalıştığı için politikalar
-- "anon" rolüne tam erişim verir. Siteyi herkese açık yayınlamadan
-- önce Supabase Auth ekleyip bu politikaları kullanıcıya göre
-- kısıtlamanız önerilir.
alter table public.courses enable row level security;
alter table public.topics  enable row level security;
alter table public.notes   enable row level security;

drop policy if exists "courses_anon_all" on public.courses;
drop policy if exists "topics_anon_all"  on public.topics;
drop policy if exists "notes_anon_all"   on public.notes;

create policy "courses_anon_all" on public.courses
  for all to anon using (true) with check (true);

create policy "topics_anon_all" on public.topics
  for all to anon using (true) with check (true);

create policy "notes_anon_all" on public.notes
  for all to anon using (true) with check (true);
