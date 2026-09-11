-- SomaCPA initial schema — Supabase (PostgreSQL)
-- Run in the Supabase SQL Editor. Idempotent where practical.

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
do $$ begin
  create type course_level as enum ('Foundation', 'Intermediate', 'Advanced');
exception when duplicate_object then null; end $$;

do $$ begin
  create type question_type as enum ('mcq', 'theory');
exception when duplicate_object then null; end $$;

do $$ begin
  create type txn_status as enum ('pending', 'success', 'failed');
exception when duplicate_object then null; end $$;

-- ---------- Profiles ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  current_tier course_level not null default 'Foundation',
  created_at timestamptz not null default now()
);

-- ---------- Courses (one row per KASNEB paper) ----------
create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  paper_code text not null unique,          -- e.g. 'CA11'
  title text not null,                      -- e.g. 'Financial Accounting'
  level course_level not null,
  description text,
  price_kes integer not null default 0,     -- per-course purchase, KES
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Modules ----------
create table if not exists modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  order_index integer not null default 0,
  unique (course_id, order_index)
);

-- ---------- Lessons ----------
create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  title text not null,
  content_markdown text not null default '',
  audio_url text,                           -- MP3 for the audio bar / offline cache
  video_url text,                           -- nullable; hidden in Low-Data Mode
  order_index integer not null default 0,
  is_free_preview boolean not null default false,
  unique (module_id, order_index)
);

-- ---------- Quizzes ----------
create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  lesson_id uuid references lessons(id) on delete set null,
  title text not null,
  unique (module_id, lesson_id)
);

-- ---------- Questions ----------
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  qtype question_type not null default 'mcq',
  question_text text not null,
  options jsonb,                            -- MCQ: ["A) ...", "B) ...", ...]
  correct_answer text,                      -- MCQ: exact text of the correct option
  explanation_markdown text,                -- MCQ: AI-generated breakdown
  grading_rubric text,                      -- theory: markdown rubric shown post-submit
  order_index integer not null default 0
);

-- ---------- Lesson progress ----------
create table if not exists lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

-- ---------- Quiz attempts ----------
create table if not exists quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  quiz_id uuid not null references quizzes(id) on delete cascade,
  score numeric,
  total integer,
  answers jsonb,
  created_at timestamptz not null default now()
);

-- ---------- Entitlements (what the student has unlocked) ----------
create table if not exists entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  granted_at timestamptz not null default now(),
  unique (user_id, course_id)
);

-- ---------- Transactions ----------
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  course_id uuid references courses(id) on delete set null,
  amount integer not null,
  currency text not null default 'KES',
  status txn_status not null default 'pending',
  mpesa_receipt_number text,
  provider_ref text,                        -- Flutterwave tx_ref / id
  created_at timestamptz not null default now()
);

-- ---------- Row Level Security ----------
alter table profiles enable row level security;
alter table courses enable row level security;
alter table modules enable row level security;
alter table lessons enable row level security;
alter table quizzes enable row level security;
alter table questions enable row level security;
alter table lesson_progress enable row level security;
alter table quiz_attempts enable row level security;
alter table entitlements enable row level security;
alter table transactions enable row level security;

-- Public catalogue: anyone can read published learning content.
drop policy if exists "catalog read" on courses;
create policy "catalog read" on courses for select using (is_published = true);
drop policy if exists "catalog read" on modules;
create policy "catalog read" on modules for select using (true);
drop policy if exists "catalog read" on lessons;
create policy "catalog read" on lessons for select using (true);
drop policy if exists "catalog read" on quizzes;
create policy "catalog read" on quizzes for select using (true);
drop policy if exists "catalog read" on questions;
create policy "catalog read" on questions for select using (true);
-- NOTE (MVP): paywall gating is enforced in the app layer via `entitlements`
-- (free previews are always open). Move to RLS join policies before public launch.

-- Profiles: users manage their own row.
drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Progress / attempts / entitlements / transactions: own rows only.
drop policy if exists "own progress" on lesson_progress;
create policy "own progress" on lesson_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own attempts" on quiz_attempts;
create policy "own attempts" on quiz_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own entitlements" on entitlements;
create policy "own entitlements" on entitlements
  for select using (auth.uid() = user_id);
drop policy if exists "own transactions" on transactions;
create policy "own transactions" on transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-create a profile row on signup.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();
