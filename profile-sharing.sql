-- Run in Supabase SQL Editor after personal-training.sql. Existing training is untouched.
begin;
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 username text unique check (username is null or username ~ '^[a-z0-9_]{3,24}$'),
 avatar_path text check (avatar_path is null or (length(avatar_path)<200 and split_part(avatar_path,'/',1)=id::text)),
 created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
drop policy if exists "Read own profile" on public.profiles;
create policy "Read own profile" on public.profiles for select to authenticated using(id=(select auth.uid()));
create or replace function public.initialize_training_profile() returns trigger language plpgsql security definer set search_path='' as $$
declare handle text:=nullif(lower(trim(new.raw_user_meta_data->>'username')),'');
begin
 if handle is not null and handle !~ '^[a-z0-9_]{3,24}$' then raise exception 'Invalid username'; end if;
 insert into public.profiles(id,username) values(new.id,handle); return new;
end; $$;
revoke all on function public.initialize_training_profile() from public,anon,authenticated;
drop trigger if exists initialize_training_profile on auth.users;
create trigger initialize_training_profile after insert on auth.users for each row execute function public.initialize_training_profile();
insert into public.profiles(id) select id from auth.users on conflict(id) do nothing;
create or replace function public.username_available(p_username text) returns boolean language sql stable security definer set search_path='' as $$
 select lower(trim(p_username)) ~ '^[a-z0-9_]{3,24}$' and not exists(select 1 from public.profiles where username=lower(trim(p_username)));
$$;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon,authenticated;
create or replace function public.claim_username(p_username text) returns public.profiles language plpgsql security definer set search_path='' as $$
declare result public.profiles; handle text:=lower(trim(p_username));
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 if handle is null or handle !~ '^[a-z0-9_]{3,24}$' then raise exception 'Use 3?24 letters, numbers or underscores'; end if;
 insert into public.profiles(id) values(auth.uid()) on conflict(id) do nothing;
 update public.profiles set username=handle where id=auth.uid() and username is null returning * into result;
 if result.id is null then raise exception 'Your username has already been set'; end if;
 return result;
exception when unique_violation then raise exception 'That username is already taken' using errcode='23505';
end; $$;
revoke all on function public.claim_username(text) from public,anon;
grant execute on function public.claim_username(text) to authenticated;
create or replace function public.set_profile_avatar(p_path text) returns public.profiles language plpgsql security definer set search_path='' as $$
declare result public.profiles;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 if p_path is not null and (length(p_path)>199 or split_part(p_path,'/',1)<>auth.uid()::text or not exists(select 1 from storage.objects where bucket_id='profile-photos' and name=p_path)) then raise exception 'Invalid profile photo'; end if;
 insert into public.profiles(id,avatar_path) values(auth.uid(),p_path) on conflict(id) do update set avatar_path=excluded.avatar_path returning * into result;
 return result;
end; $$;
revoke all on function public.set_profile_avatar(text) from public,anon;
grant execute on function public.set_profile_avatar(text) to authenticated;
create table if not exists public.workout_shares (
 id uuid primary key default gen_random_uuid(), sender_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade, sender_username text not null,
 sessions jsonb not null check(jsonb_typeof(sessions)='array' and jsonb_array_length(sessions) between 1 and 50 and octet_length(sessions::text)<=1048576),
 created_at timestamptz not null default now(), check(sender_id<>recipient_id)
);
create index if not exists workout_shares_inbox on public.workout_shares(recipient_id,created_at desc,id);
create index if not exists workout_shares_sender_rate on public.workout_shares(sender_id,created_at desc);
alter table public.workout_shares enable row level security;
revoke all on public.workout_shares from anon,authenticated;
grant select on public.workout_shares to authenticated;
drop policy if exists "Read received workouts" on public.workout_shares;
create policy "Read received workouts" on public.workout_shares for select to authenticated using(recipient_id=(select auth.uid()) and exists(select 1 from public.profiles where id=(select auth.uid()) and username is not null));
create or replace function public.send_workout(p_recipient text,p_sessions jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare sender_handle text; target_id uuid; shared_id uuid; s jsonb; e jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 select username into sender_handle from public.profiles where id=auth.uid();
 if sender_handle is null then raise exception 'Create your username on Profile before sharing'; end if;
 select id into target_id from public.profiles where username=lower(trim(p_recipient));
 if target_id is null then raise exception 'No user has that username'; end if;
 if target_id=auth.uid() then raise exception 'Choose another user'; end if;
 if p_sessions is null or jsonb_typeof(p_sessions)<>'array' then raise exception 'Invalid sessions'; end if;
 if jsonb_array_length(p_sessions) not between 1 and 50 or octet_length(p_sessions::text)>1048576 then raise exception 'Share at most 50 sessions (1 MB)'; end if;
 for s in select value from jsonb_array_elements(p_sessions) loop
  if jsonb_typeof(s)<>'object' or jsonb_typeof(s->'name') is distinct from 'string' or length(trim(s->>'name')) not between 1 and 120 or jsonb_typeof(s->'exercises') is distinct from 'array' then raise exception 'Invalid session'; end if;
  if jsonb_array_length(s->'exercises') not between 1 and 100 then raise exception 'Each session needs 1?100 exercises'; end if;
  for e in select value from jsonb_array_elements(s->'exercises') loop
   if jsonb_typeof(e)<>'object' or jsonb_typeof(e->'slug') is distinct from 'string' or (e->>'slug') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(e->>'slug')>160
    or jsonb_typeof(e->'name') is distinct from 'string' or length(e->>'name') not between 1 and 200
    or jsonb_typeof(e->'level') is distinct from 'string' or length(e->>'level') not between 1 and 40
    or jsonb_typeof(e->'category') is distinct from 'string' or length(e->>'category') not between 1 and 80
    or jsonb_typeof(e->'primaryMuscles') is distinct from 'array' or not(e ? 'equipment' and e ? 'thumbUrl')
    or (e->'equipment'<>'null'::jsonb and (jsonb_typeof(e->'equipment')<>'string' or length(e->>'equipment') not between 1 and 100))
    or (e->'thumbUrl'<>'null'::jsonb and (jsonb_typeof(e->'thumbUrl')<>'string' or (e->>'thumbUrl') !~ '^https://' or length(e->>'thumbUrl')>2048)) then raise exception 'Invalid shared exercise'; end if;
   if jsonb_array_length(e->'primaryMuscles')>30 or exists(select 1 from jsonb_array_elements(e->'primaryMuscles') v where jsonb_typeof(v)<>'string' or length(v#>>'{}') not between 1 and 60) then raise exception 'Invalid muscles'; end if;
   if e ? 'targetAreas' then
    if jsonb_typeof(e->'targetAreas')<>'array' then raise exception 'Invalid targets'; end if;
    if jsonb_array_length(e->'targetAreas')>40 or exists(select 1 from jsonb_array_elements(e->'targetAreas') v where jsonb_typeof(v)<>'string' or length(v#>>'{}') not between 1 and 60) then raise exception 'Invalid targets'; end if;
   end if;
  end loop;
 end loop;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if (select count(*) from public.workout_shares where sender_id=auth.uid() and created_at>now()-interval '1 hour')>=30 then raise exception 'Sharing limit reached. Try again later'; end if;
 -- Whitelist fields so notes, history and sender session IDs are never shared.
 select jsonb_agg(jsonb_build_object('name',v->>'name','exercises',(select jsonb_agg(jsonb_build_object('slug',x->>'slug','name',x->>'name','level',x->>'level','category',x->>'category','equipment',x->'equipment','primaryMuscles',x->'primaryMuscles','targetAreas',coalesce(x->'targetAreas','[]'::jsonb),'thumbUrl',x->'thumbUrl')) from jsonb_array_elements(v->'exercises') x))) into p_sessions from jsonb_array_elements(p_sessions) v;
 insert into public.workout_shares(sender_id,recipient_id,sender_username,sessions) values(auth.uid(),target_id,sender_handle,p_sessions) returning id into shared_id;
 return shared_id;
end; $$;
revoke all on function public.send_workout(text,jsonb) from public,anon;
grant execute on function public.send_workout(text,jsonb) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('profile-photos','profile-photos',false,2097152,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set public=false,file_size_limit=2097152,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists "Read own profile photo" on storage.objects;
create policy "Read own profile photo" on storage.objects for select to authenticated using(bucket_id='profile-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Upload own profile photo" on storage.objects;
create policy "Upload own profile photo" on storage.objects for insert to authenticated with check(bucket_id='profile-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Delete own profile photo" on storage.objects;
create policy "Delete own profile photo" on storage.objects for delete to authenticated using(bucket_id='profile-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
commit;
