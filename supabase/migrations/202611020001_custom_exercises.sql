create table if not exists public.custom_exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null unique,
  youtube_video_id text not null check (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  created_at timestamptz not null default now()
);

alter table public.custom_exercises enable row level security;
revoke insert, update, delete on public.custom_exercises from anon, authenticated;
grant select on public.custom_exercises to anon, authenticated;
grant select, insert on public.custom_exercises to service_role;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public'
      and tablename = 'custom_exercises' and policyname = 'Public can read exercises'
  ) then
    create policy "Public can read exercises" on public.custom_exercises
      for select to anon, authenticated using (true);
  end if;
end $$;
