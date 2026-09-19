-- How busy a gym is, as CresQ lifters report it. No account, no device, nothing about the person:
-- a gym's name, a level from one to three, and the time, which the server stamps itself.
-- Applied to project caebqprwvxtipfgmedhx on 19 September 2026; kept here so the schema is in the repository.
create table if not exists public.gym_reports (
  id bigint generated always as identity primary key,
  gym_key text not null check (char_length(gym_key) between 2 and 120),
  gym_name text not null check (char_length(gym_name) between 2 and 120),
  level smallint not null check (level between 1 and 3),
  reported_at timestamptz not null default now()
);

create index if not exists gym_reports_key_time on public.gym_reports (gym_key, reported_at desc);

alter table public.gym_reports enable row level security;

drop policy if exists gym_reports_read on public.gym_reports;
create policy gym_reports_read on public.gym_reports for select to anon, authenticated using (true);

-- A report is about now. Whatever time a client sends, only one within five minutes of the server's clock is accepted,
-- so nobody can backfill a pattern that was never there.
drop policy if exists gym_reports_insert on public.gym_reports;
create policy gym_reports_insert on public.gym_reports for insert to anon, authenticated
  with check (reported_at between now() - interval '5 minutes' and now() + interval '5 minutes');

-- What the app asks for a gym: the last hour and a half averaged ("now"), and this weekday's hours
-- from the last four months (that gym's own pattern). Dutch gyms, so Dutch clock time.
create or replace function public.gym_busyness(p_gym_key text)
returns json
language sql
stable
security invoker
set search_path = public
as $$
  with recent as (
    select level, reported_at
    from gym_reports
    where gym_key = p_gym_key and reported_at > now() - interval '90 minutes'
  ), weekday as (
    select extract(hour from reported_at at time zone 'Europe/Amsterdam')::int as hour,
           avg(level)::float as level,
           count(*)::int as n
    from gym_reports
    where gym_key = p_gym_key
      and reported_at > now() - interval '120 days'
      and extract(isodow from reported_at at time zone 'Europe/Amsterdam') = extract(isodow from now() at time zone 'Europe/Amsterdam')
    group by 1
  )
  select json_build_object(
    'live', (select case when count(*) = 0 then null else json_build_object('level', avg(level)::float, 'n', count(*)::int, 'latest', (extract(epoch from max(reported_at)) * 1000)::bigint) end from recent),
    'hours', coalesce((select json_agg(json_build_object('hour', hour, 'level', level, 'n', n) order by hour) from weekday), '[]'::json)
  );
$$;

revoke all on function public.gym_busyness(text) from public;
grant execute on function public.gym_busyness(text) to anon, authenticated;
