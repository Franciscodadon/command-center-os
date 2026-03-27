-- Command Center OS — Supabase Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────
create table if not exists users (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null unique,
  first_name text,
  onboarded  boolean default false,
  created_at timestamptz default now()
);
alter table users enable row level security;
create policy "users_own" on users for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- VISION LAYERS
-- ─────────────────────────────────────────
create table if not exists vision_layers (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users not null,
  time_horizon text not null, -- 'lifetime'|'10year'|'3year'|'1year'|'quarterly'|'monthly'|'weekly'
  content      text,
  updated_at   timestamptz default now(),
  created_at   timestamptz default now()
);
alter table vision_layers enable row level security;
create policy "vision_own" on vision_layers for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- GOALS
-- ─────────────────────────────────────────
create table if not exists goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users not null,
  title        text not null,
  area_of_life text,
  time_horizon text default 'quarterly', -- 'quarterly'|'monthly'|'weekly'
  due_date     date,
  progress     integer default 0,
  status       text default 'On Track',
  parent_id    uuid references goals(id),
  notes        text,
  created_at   timestamptz default now()
);
alter table goals enable row level security;
create policy "goals_own" on goals for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- LEAD MEASURES
-- ─────────────────────────────────────────
create table if not exists lead_measures (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null,
  goal_id       uuid references goals(id) on delete cascade,
  name          text not null,
  unit          text,
  weekly_target numeric,
  sort_order    integer default 0,
  created_at    timestamptz default now()
);
alter table lead_measures enable row level security;
create policy "lm_own" on lead_measures for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- LEAD MEASURE ACTUALS
-- ─────────────────────────────────────────
create table if not exists lm_actuals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users not null,
  lead_measure_id uuid references lead_measures(id) on delete cascade,
  week_start_date date not null,
  actual          numeric default 0,
  created_at      timestamptz default now(),
  unique(lead_measure_id, week_start_date)
);
alter table lm_actuals enable row level security;
create policy "lm_actuals_own" on lm_actuals for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- PROJECTS
-- ─────────────────────────────────────────
create table if not exists projects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users not null,
  title        text not null,
  description  text,
  area_of_life text,
  due_date     date,
  status       text default 'Active',
  color        text,
  created_at   timestamptz default now()
);
alter table projects enable row level security;
create policy "projects_own" on projects for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- PROJECT TASKS
-- ─────────────────────────────────────────
create table if not exists project_tasks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  project_id uuid references projects(id) on delete cascade,
  title      text not null,
  done       boolean default false,
  due_date   date,
  sort_order integer default 0,
  created_at timestamptz default now()
);
alter table project_tasks enable row level security;
create policy "project_tasks_own" on project_tasks for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- TASKS (Priority Matrix)
-- ─────────────────────────────────────────
create table if not exists tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users not null,
  title        text not null,
  quadrant     text default 'Q2', -- 'Q1'|'Q2'|'Q3'|'Q4'|'inbox'
  due_date     date,
  done         boolean default false,
  notes        text,
  area_of_life text,
  created_at   timestamptz default now()
);
alter table tasks enable row level security;
create policy "tasks_own" on tasks for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- SUBTASKS
-- ─────────────────────────────────────────
create table if not exists subtasks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  task_id    uuid references tasks(id) on delete cascade,
  title      text not null,
  done       boolean default false,
  sort_order integer default 0,
  created_at timestamptz default now()
);
alter table subtasks enable row level security;
create policy "subtasks_own" on subtasks for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- HABITS
-- ─────────────────────────────────────────
create table if not exists habits (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  name       text not null,
  category   text,
  active     boolean default true,
  created_at timestamptz default now()
);
alter table habits enable row level security;
create policy "habits_own" on habits for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- HABIT CHECKS
-- ─────────────────────────────────────────
create table if not exists habit_checks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  habit_id   uuid references habits(id) on delete cascade,
  date       date not null,
  done       boolean default false,
  created_at timestamptz default now(),
  unique(habit_id, date)
);
alter table habit_checks enable row level security;
create policy "habit_checks_own" on habit_checks for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- JOURNAL ENTRIES
-- ─────────────────────────────────────────
create table if not exists journal_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  date        date not null,
  gratitude   text,
  wins        text,
  reflections text,
  notes       text,
  mood        integer, -- 1-5
  created_at  timestamptz default now(),
  unique(user_id, date)
);
alter table journal_entries enable row level security;
create policy "journal_own" on journal_entries for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- VAULT ENTRIES
-- ─────────────────────────────────────────
create table if not exists vault_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  content    text,
  analysis   text,
  tags       text[],
  created_at timestamptz default now()
);
alter table vault_entries enable row level security;
create policy "vault_own" on vault_entries for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- SCORECARD METRICS
-- ─────────────────────────────────────────
create table if not exists scorecard_metrics (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  name        text not null,
  target      numeric,
  lower_better boolean default false,
  source      text default 'manual', -- 'manual'|'goal'|'lead_measure'
  source_id   uuid,
  created_at  timestamptz default now()
);
alter table scorecard_metrics enable row level security;
create policy "scorecard_metrics_own" on scorecard_metrics for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- SCORECARD VALUES
-- ─────────────────────────────────────────
create table if not exists scorecard_values (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  metric_id  uuid references scorecard_metrics(id) on delete cascade,
  week_start date not null,
  actual     numeric,
  created_at timestamptz default now(),
  unique(metric_id, week_start)
);
alter table scorecard_values enable row level security;
create policy "scorecard_values_own" on scorecard_values for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- AI CONVERSATIONS
-- ─────────────────────────────────────────
create table if not exists ai_conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  module     text,
  messages   jsonb default '[]',
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);
alter table ai_conversations enable row level security;
create policy "ai_conv_own" on ai_conversations for all using (auth.uid() = user_id);
