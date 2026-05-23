-- Void Bastion Defense — Supabase Schema Setup
-- Run this in the Supabase SQL Editor after creating your project

-- Saves table: one row per user storing full game state as JSONB
create table if not exists saves (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    save_data jsonb not null default '{}',
    updated_at timestamp with time zone default now(),
    unique(user_id)
);

-- Enable Row Level Security
alter table saves enable row level security;

-- Users can only read/write their own saves
create policy "Users can manage own saves"
    on saves
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Index for fast lookups
create index if not exists idx_saves_user_id on saves(user_id);

-- Grant usage to authenticated users
grant select, insert, update, delete on table saves to authenticated;

-- Optional: Leaderboard table for public scores
create table if not exists leaderboard (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade,
    player_name text not null default 'Unknown',
    score integer not null default 0,
    waves_survived integer not null default 0,
    total_kills integer not null default 0,
    endless_mode boolean not null default false,
    created_at timestamp with time zone default now(),
    unique(user_id, endless_mode)
);

alter table leaderboard enable row level security;

create policy "Users can manage own leaderboard entries"
    on leaderboard
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Leaderboard is publicly readable"
    on leaderboard
    for select
    using (true);

grant select on table leaderboard to anon;
grant select, insert, update, delete on table leaderboard to authenticated;

create index if not exists idx_leaderboard_score on leaderboard(score desc);
create index if not exists idx_leaderboard_endless on leaderboard(endless_mode, score desc);
