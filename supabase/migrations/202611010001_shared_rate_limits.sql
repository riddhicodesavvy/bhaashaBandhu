-- One row per UID/operation; atomic fixed windows shared across all instances.
create table if not exists public.api_rate_limits (
  uid text not null,
  operation text not null,
  window_start timestamptz not null,
  hits integer not null,
  primary key (uid, operation)
);
alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from public, anon, authenticated;

create or replace function public.consume_api_limit(p_uid text, p_operation text, p_limit integer)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare current_hits integer; bucket timestamptz := date_trunc('minute', clock_timestamp());
begin
  if length(p_uid) < 1 or length(p_uid) > 128 or p_limit < 1 or p_limit > 300 then
    raise exception 'Invalid rate limit parameters';
  end if;
  insert into public.api_rate_limits(uid, operation, window_start, hits)
  values (p_uid, p_operation, bucket, 1)
  on conflict (uid, operation) do update set
    hits = case when api_rate_limits.window_start < bucket then 1 else least(api_rate_limits.hits + 1, p_limit + 1) end,
    window_start = greatest(api_rate_limits.window_start, bucket)
  returning hits into current_hits;
  return current_hits <= p_limit;
end;
$$;
revoke all on function public.consume_api_limit(text,text,integer) from public, anon, authenticated;
grant execute on function public.consume_api_limit(text,text,integer) to service_role;
