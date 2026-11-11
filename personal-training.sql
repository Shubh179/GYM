-- Run after the existing supabase/migrations files in the Supabase SQL editor.
create table if not exists public.personal_training (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb check (jsonb_typeof(state) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.personal_training enable row level security;
revoke all on public.personal_training from anon, authenticated;
grant select, insert, update on public.personal_training to authenticated;
drop policy if exists "Read own training" on public.personal_training;
create policy "Read own training" on public.personal_training for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Insert own training" on public.personal_training;
create policy "Insert own training" on public.personal_training for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "Update own training" on public.personal_training;
create policy "Update own training" on public.personal_training for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- SECURITY INVOKER retains RLS. Caller cannot supply another user's ID.
-- null means the revision changed: reload and merge before retrying.
create or replace function public.save_personal_training(p_state jsonb, p_revision bigint)
returns bigint language plpgsql security invoker set search_path = public as $$
declare saved_revision bigint;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if jsonb_typeof(p_state) is distinct from 'object' or octet_length(p_state::text) > 5242880 then
    raise exception 'Invalid training snapshot';
  end if;
  if p_revision = 0 then
    insert into public.personal_training(user_id, state, revision)
    values (auth.uid(), p_state, 1) on conflict (user_id) do nothing
    returning revision into saved_revision;
  else
    update public.personal_training set state = p_state, revision = revision + 1, updated_at = now()
    where user_id = auth.uid() and revision = p_revision
    returning revision into saved_revision;
  end if;
  return saved_revision;
end;
$$;
revoke all on function public.save_personal_training(jsonb, bigint) from public, anon;
grant execute on function public.save_personal_training(jsonb, bigint) to authenticated;
