-- ============================================================
-- MWnotes. · Supabase şeması (v3 — Birlikte Çalışma Sistemi)
-- ============================================================
-- Önceki tablolar bozulmadan çalışır; yeni tablolar eklenir.
-- Supabase Dashboard > SQL Editor > New query > tüm içeriği yapıştır > Run
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

-- ============================================================
-- Birlikte Çalışma Sistemi Tabloları (v3)
-- ============================================================

-- Kullanıcı profilleri (e-posta lookup için)
-- auth.users tablosuna doğrudan erişim RLS ile kısıtlı, bu yüzden
-- public bir profil tablosu kullanıyoruz.
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  updated_at timestamptz not null default now()
);

-- Yeni kullanıcı kaydolduğunda profile otomatik oluştur
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Mevcut kullanıcıları profiles tablosuna aktar
insert into public.profiles (id, email)
  select id, email from auth.users
  on conflict (id) do update set email = excluded.email;

-- Birlikte çalışma oturumları ----------------------------------
-- Timer state'i burada tutuyoruz; her iki kullanıcı da subscribe olur.
create table if not exists public.study_sessions (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users (id) on delete cascade,
  partner_id      uuid references auth.users (id) on delete set null,

  -- Timer durumu (realtime sync için)
  timer_mode      text not null default 'focus',          -- 'focus' | 'shortBreak' | 'longBreak'
  timer_running   boolean not null default false,
  timer_started_at timestamptz,                           -- çalışmaya başladığı an
  timer_remaining  integer not null default 1500,         -- duraklatıldığındaki kalan saniye

  -- Paylaşılan notlar: Belirli course id'lerinin listesi (JSON array)
  shared_course_ids text[] not null default '{}',

  status          text not null default 'active',         -- 'active' | 'ended'
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Oturum davetleri ------------------------------------------
create table if not exists public.study_invites (
  id              uuid primary key default gen_random_uuid(),
  from_user_id    uuid not null references auth.users (id) on delete cascade,
  to_email        text not null,
  to_user_id      uuid references auth.users (id) on delete cascade,
  session_id      uuid references public.study_sessions (id) on delete cascade,
  status          text not null default 'pending',       -- 'pending' | 'accepted' | 'rejected' | 'expired'
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '24 hours')
);

-- İndeksler
create index if not exists courses_user_id_idx     on public.courses (user_id);
create index if not exists topics_course_id_idx    on public.topics (course_id);
create index if not exists topics_user_id_idx      on public.topics (user_id);
create index if not exists notes_topic_id_idx      on public.notes (topic_id);
create index if not exists notes_user_id_idx       on public.notes (user_id);
create index if not exists notes_updated_at_idx    on public.notes (updated_at desc);
create index if not exists invites_to_user_idx     on public.study_invites (to_user_id, status);
create index if not exists invites_from_user_idx   on public.study_invites (from_user_id);
create index if not exists sessions_owner_idx      on public.study_sessions (owner_id, status);
create index if not exists sessions_partner_idx    on public.study_sessions (partner_id, status);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.courses       enable row level security;
alter table public.topics        enable row level security;
alter table public.notes         enable row level security;
alter table public.profiles      enable row level security;
alter table public.study_sessions enable row level security;
alter table public.study_invites  enable row level security;

-- Mevcut politikaları temizle
drop policy if exists "courses_anon_all"      on public.courses;
drop policy if exists "topics_anon_all"       on public.topics;
drop policy if exists "notes_anon_all"        on public.notes;
drop policy if exists "courses_user_all"      on public.courses;
drop policy if exists "topics_user_all"       on public.topics;
drop policy if exists "notes_user_all"        on public.notes;
drop policy if exists "notes_partner_select"  on public.notes;
drop policy if exists "topics_partner_select" on public.topics;
drop policy if exists "courses_partner_select" on public.courses;
drop policy if exists "profiles_own"          on public.profiles;
drop policy if exists "profiles_search"       on public.profiles;
drop policy if exists "sessions_participants" on public.study_sessions;
drop policy if exists "sessions_update_participants" on public.study_sessions;
drop policy if exists "invites_own"           on public.study_invites;
drop policy if exists "invites_received"      on public.study_invites;
drop policy if exists "invites_update_target" on public.study_invites;

-- Dersler (sahip + aktif ortak da görebilir)
create policy "courses_user_all" on public.courses
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Ortak kullanıcı paylaşılan dersleri görebilir
create policy "courses_partner_select" on public.courses
  for select to authenticated
  using (
    id = any(
      select unnest(s.shared_course_ids::uuid[])
      from public.study_sessions s
      where s.status = 'active'
        and s.partner_id = auth.uid()
    )
  );

-- Konular
create policy "topics_user_all" on public.topics
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "topics_partner_select" on public.topics
  for select to authenticated
  using (
    course_id = any(
      select unnest(s.shared_course_ids::uuid[])
      from public.study_sessions s
      where s.status = 'active'
        and s.partner_id = auth.uid()
    )
  );

-- Notlar
create policy "notes_user_all" on public.notes
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notes_partner_select" on public.notes
  for select to authenticated
  using (
    topic_id in (
      select t.id from public.topics t
      where t.course_id = any(
        select unnest(s.shared_course_ids::uuid[])
        from public.study_sessions s
        where s.status = 'active'
          and s.partner_id = auth.uid()
      )
    )
  );

-- Profiller (kendi profilini okuyup yaz, diğerlerini e-posta araması için oku)
create policy "profiles_own" on public.profiles
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_search" on public.profiles
  for select to authenticated
  using (true);  -- e-posta araması için herkese açık okuma

-- Çalışma oturumları (katılımcılar görebilir ve güncelleyebilir)
create policy "sessions_participants" on public.study_sessions
  for select to authenticated
  using (owner_id = auth.uid() or partner_id = auth.uid());

create policy "sessions_owner_insert" on public.study_sessions
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy "sessions_update_participants" on public.study_sessions
  for update to authenticated
  using (owner_id = auth.uid() or partner_id = auth.uid());

-- Davetler
create policy "invites_own" on public.study_invites
  for all to authenticated
  using (from_user_id = auth.uid())
  with check (from_user_id = auth.uid());

create policy "invites_received" on public.study_invites
  for select to authenticated
  using (to_user_id = auth.uid());

create policy "invites_update_target" on public.study_invites
  for update to authenticated
  using (to_user_id = auth.uid());

-- Realtime aboneliği için publication ayarları
-- (Bu komut yalnızca bir kez çalıştırılmalı; hata verirse güvenle atlayabilirsiniz)
alter publication supabase_realtime add table public.study_sessions;
alter publication supabase_realtime add table public.study_invites;
