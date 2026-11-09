-- Add target metadata without assigning guesses to existing exercises.
alter table public.custom_exercises
  add column if not exists primary_muscles text[] not null default '{}',
  add column if not exists target_areas text[] not null default '{}';

do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.custom_exercises'::regclass and conname = 'custom_exercises_primary_muscles_valid') then
    alter table public.custom_exercises add constraint custom_exercises_primary_muscles_valid check (
      cardinality(primary_muscles) <= 17 and array_position(primary_muscles, null) is null
      and primary_muscles <@ array[
        'abdominals', 'abductors', 'adductors', 'biceps', 'calves', 'chest', 'forearms', 'glutes',
        'hamstrings', 'lats', 'lower back', 'middle back', 'neck', 'quadriceps', 'shoulders', 'traps', 'triceps'
      ]::text[]
    );
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.custom_exercises'::regclass and conname = 'custom_exercises_target_areas_valid') then
    alter table public.custom_exercises add constraint custom_exercises_target_areas_valid check (
      cardinality(target_areas) <= 28 and array_position(target_areas, null) is null
      and target_areas <@ array[
        'upper-chest', 'middle-chest', 'lower-chest', 'lats', 'middle-back', 'upper-traps', 'lower-back',
        'front-delts', 'side-delts', 'rear-delts', 'biceps-long-head', 'biceps-short-head', 'brachialis',
        'triceps-long-head', 'triceps-lateral-head', 'triceps-medial-head', 'forearm-flexors', 'forearm-extensors',
        'quads', 'hamstrings', 'glute-max', 'hip-abductors', 'hip-adductors', 'gastrocnemius', 'soleus',
        'rectus-abdominis', 'obliques', 'neck'
      ]::text[]
    );
  end if;
end $$;

-- Only the verified admin API uses this privileged server role.
grant update on public.custom_exercises to service_role;
notify pgrst, 'reload schema';
