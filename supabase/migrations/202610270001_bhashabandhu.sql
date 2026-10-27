-- Application data only. Firebase UID is the identity key; Supabase Auth is unused.
-- Review existing schema before running in the user's existing Supabase project.
begin;

create table if not exists public.construction_sites (
  id text primary key, site_id text not null unique, owner_id text not null default '',
  payload jsonb not null, version integer not null default 1 check (version > 0),
  check (id = 'site:' || site_id and payload->>'id' = site_id)
);
create table if not exists public.user_profiles (
  id text primary key,
  firebase_uid text generated always as (payload->>'id') stored unique not null,
  email text generated always as (payload->>'email') stored unique not null,
  display_name text generated always as (payload->>'displayName') stored not null,
  role text generated always as (payload->>'role') stored not null,
  preferred_language text generated always as (payload->>'preferredLanguage') stored not null,
  site_id text not null references public.construction_sites(site_id),
  owner_id text not null, payload jsonb not null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (id = 'profile:' || owner_id and payload->>'id' = owner_id),
  check (role in ('worker','contractor','hospital_responder')),
  check (payload->>'siteId' = site_id and payload->>'isDemo' = 'true'),
  check (payload->>'preferredLanguage' in ('en','hi','bn'))
);
create table if not exists public.tasks (
  id text primary key, site_id text not null references public.construction_sites(site_id),
  owner_id text not null references public.user_profiles(firebase_uid), payload jsonb not null,
  status text generated always as (payload->>'status') stored not null,
  version integer not null default 1 check (version > 0),
  check (id = 'task:' || (payload->>'id') and payload->>'siteId' = site_id and payload->>'assignedTo' = owner_id),
  check (status in ('assigned','acknowledged','in_progress','completed'))
);
create table if not exists public.incidents (
  id text primary key, site_id text not null references public.construction_sites(site_id),
  owner_id text not null references public.user_profiles(firebase_uid), payload jsonb not null,
  status text generated always as (payload->>'status') stored not null,
  version integer not null default 1 check (version > 0),
  check (id = 'incident:' || (payload->>'id') and payload->>'siteId' = site_id and payload->>'reporterId' = owner_id),
  check (payload->>'isSimulation' = 'true' and jsonb_typeof(payload->'events') = 'array'),
  check (status in ('reported','reviewed','acknowledged_demo','follow_up_demo','closed_demo'))
);
create table if not exists public.incident_events (
  id uuid primary key,
  incident_id text not null references public.incidents(id),
  actor_firebase_uid text not null references public.user_profiles(firebase_uid),
  actor_role text not null check (actor_role in ('worker','contractor','hospital_responder')),
  from_status text, to_status text not null,
  created_at timestamptz not null
);
create table if not exists public.wage_entries (
  id text primary key, site_id text not null references public.construction_sites(site_id),
  owner_id text not null references public.user_profiles(firebase_uid), payload jsonb not null,
  version integer not null default 1 check (version > 0),
  check (id = 'wage:' || (payload->>'id') and payload->>'siteId' = site_id and payload->>'workerId' = owner_id)
);

create index if not exists bb_profiles_site on public.user_profiles(site_id);
create index if not exists bb_tasks_site_owner on public.tasks(site_id, owner_id);
create index if not exists bb_incidents_site_status on public.incidents(site_id, status);
create index if not exists bb_incidents_owner on public.incidents(owner_id);
create index if not exists bb_events_incident_time on public.incident_events(incident_id, created_at);
create index if not exists bb_wages_site_owner on public.wage_entries(site_id, owner_id);

create or replace function public.bb_enforce_record_version() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.id <> old.id or new.site_id <> old.site_id or new.owner_id <> old.owner_id then
    raise exception 'Record identity and scope cannot be changed';
  end if;
  if new.version <> old.version + 1 then raise exception 'Record version must increment once'; end if;
  if tg_table_name = 'user_profiles' then new.updated_at := now(); end if;
  return new;
end $$;
create or replace function public.bb_sync_incident_events() returns trigger
language plpgsql security definer set search_path = public as $$
declare old_length integer := 0; event jsonb; i integer;
begin
  if tg_op = 'UPDATE' then
    old_length := jsonb_array_length(old.payload->'events');
    if jsonb_array_length(new.payload->'events') < old_length then raise exception 'Audit history cannot shrink'; end if;
    if old_length > 0 then
      for i in 0..old_length-1 loop
        if (new.payload->'events'->i) is distinct from (old.payload->'events'->i) then raise exception 'Audit history is immutable'; end if;
      end loop;
    end if;
  end if;
  if jsonb_array_length(new.payload->'events') = 0 or
    (new.payload->'events'->(-1)->>'to') is distinct from (new.payload->>'status') then
    raise exception 'Incident status must match its last audit event';
  end if;
  for event in select value from jsonb_array_elements(new.payload->'events') with ordinality as e(value, position) where position > old_length loop
    insert into public.incident_events(id, incident_id, actor_firebase_uid, actor_role, from_status, to_status, created_at)
    values ((event->>'id')::uuid, new.id, event->>'actorId', event->>'actorRole', event->>'from', event->>'to', (event->>'at')::timestamptz);
  end loop;
  return new;
end $$;
create or replace function public.bb_deny_audit_change() returns trigger
language plpgsql set search_path = public as $$ begin raise exception 'Audit events are append-only'; end $$;

do $$ declare name text; begin
  foreach name in array array['construction_sites','user_profiles','tasks','incidents','wage_entries'] loop
    execute format('alter table public.%I enable row level security', name);
    execute format('revoke all on public.%I from anon, authenticated, service_role', name);
    execute format('grant select, insert, update on public.%I to service_role', name);
    execute format('drop trigger if exists bb_record_version on public.%I', name);
    execute format('create trigger bb_record_version before update on public.%I for each row execute function public.bb_enforce_record_version()', name);
  end loop;
end $$;
alter table public.incident_events enable row level security;
revoke all on public.incident_events from anon, authenticated, service_role;
grant select on public.incident_events to service_role;
drop trigger if exists bb_incident_audit on public.incidents;
create trigger bb_incident_audit after insert or update on public.incidents for each row execute function public.bb_sync_incident_events();
drop trigger if exists bb_immutable_audit on public.incident_events;
create trigger bb_immutable_audit before update or delete on public.incident_events for each row execute function public.bb_deny_audit_change();
revoke all on function public.bb_enforce_record_version() from public, anon, authenticated;
revoke all on function public.bb_sync_incident_events() from public, anon, authenticated;
revoke all on function public.bb_deny_audit_change() from public, anon, authenticated;
commit;
