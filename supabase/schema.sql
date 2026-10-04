-- ============================================================
-- MWnotes. · Supabase şeması (v2 — hesap sistemi)
-- Kurulum: Supabase Dashboard > SQL Editor > New query,
-- bu dosyanın tamamını yapıştırıp "Run" düğmesine basın.
--
-- Hem ilk kurulumda hem de eski (hesapsız) şemadan güncelleme
-- için çalıştırılabilir; mevcut tablolar bozulmaz.
-- ============================================================

create extension if not exists pgcrypto;

-- Dersler -----------------------------------------------------
create table if not exists public.courses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete cascade,
  name       text not null,
  color      text not null default '#6366f1',
  created_at timestamptz not null default now()
);
alter table public.courses add column if not exists user_id uuid references auth.users (id) on delete cascade;

-- Derslerin altındaki konular --------------------------------
create table if not exists public.topics (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete cascade,
  course_id  uuid not null references public.courses (id) on delete cascade,
  title      text not null,
  created_at timestamptz not null default now()
);
alter table public.topics add column if not exists user_id uuid references auth.users (id) on delete cascade;

-- Konuların altındaki notlar ----------------------------------
create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete cascade,
  topic_id   uuid not null references public.topics (id) on delete cascade,
  content    text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.notes add column if not exists user_id uuid references auth.users (id) on delete cascade;

create index if not exists courses_user_id_idx  on public.courses (user_id);
create index if not exists topics_course_id_idx on public.topics (course_id);
create index if not exists topics_user_id_idx   on public.topics (user_id);
create index if not exists notes_topic_id_idx   on public.notes (topic_id);
create index if not exists notes_user_id_idx    on public.notes (user_id);
create index if not exists notes_updated_at_idx on public.notes (updated_at desc);

-- Row Level Security ------------------------------------------
-- Her kullanıcı yalnızca kendi hesabına bağlı kayıtlara
-- erişebilir; başka kullanıcıların verilerini göremez.
alter table public.courses enable row level security;
alter table public.topics  enable row level security;
alter table public.notes   enable row level security;

-- Eski (hesapsız) politikaları temizle
drop policy if exists "courses_anon_all" on public.courses;
drop policy if exists "topics_anon_all"  on public.topics;
drop policy if exists "notes_anon_all"   on public.notes;

drop policy if exists "courses_user_all" on public.courses;
drop policy if exists "topics_user_all"  on public.topics;
drop policy if exists "notes_user_all"   on public.notes;

create policy "courses_user_all" on public.courses
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "topics_user_all" on public.topics
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notes_user_all" on public.notes
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
