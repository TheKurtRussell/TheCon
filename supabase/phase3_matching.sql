-- =====================================================================
-- The CON: Phase 3 (matching, likes, blocks, reports)
-- Run once in Supabase: SQL Editor > New query > paste all > Run.
-- Needs Phase 2 first. Safe to re-run.
-- =====================================================================

-- ---------- Matching preferences (private: only the owner can read) ----------
-- appear_in: groups a person opts in to being shown as (women, men, nonbinary).
-- show_me:   groups they want to see ('everyone' = no filter).
-- Two people only see each other when BOTH sides' choices allow it.
alter table public.profile_private
  add column if not exists appear_in text[] not null default '{}',
  add column if not exists show_me text[] not null default '{everyone}',
  add column if not exists age_min smallint not null default 18,
  add column if not exists age_max smallint not null default 99;

alter table public.profile_private drop constraint if exists match_prefs_valid;
alter table public.profile_private add constraint match_prefs_valid check (
  age_min >= 18 and age_max <= 120 and age_min <= age_max
  and appear_in <@ array['women', 'men', 'nonbinary']
  and show_me <@ array['women', 'men', 'nonbinary', 'everyone']
);

-- ---------- Likes and passes ----------
create table if not exists public.likes (
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  action text not null check (action in ('like', 'pass')),
  created_at timestamptz not null default now(),
  primary key (from_id, to_id),
  check (from_id <> to_id)
);
create index if not exists likes_to_idx on public.likes (to_id, action);

-- ---------- Blocks ----------
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- ---------- Reports (the moderation queue reads these in Phase 5) ----------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in (
    'fake_profile', 'underage', 'harassment', 'hate', 'spam_scam', 'inappropriate_photos', 'other')),
  details text check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'closed')),
  created_at timestamptz not null default now()
);

-- ---------- Helper: has either person blocked the other? ----------
create or replace function public.is_blocked_pair(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

-- ---------- Block hides people both ways, everywhere ----------
drop policy if exists "members can view profiles" on public.profiles;
create policy "members can view profiles" on public.profiles
  for select to authenticated using (not public.is_blocked_pair(auth.uid(), id));
drop policy if exists "members can view picked fandoms" on public.profile_fandoms;
create policy "members can view picked fandoms" on public.profile_fandoms
  for select to authenticated using (not public.is_blocked_pair(auth.uid(), profile_id));
drop policy if exists "members can view photos" on public.photos;
create policy "members can view photos" on public.photos
  for select to authenticated using (not public.is_blocked_pair(auth.uid(), profile_id));

-- ---------- RLS for the new tables ----------
alter table public.likes enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

drop policy if exists "see own likes" on public.likes;
create policy "see own likes" on public.likes
  for select to authenticated using (from_id = auth.uid());

drop policy if exists "manage own blocks" on public.blocks;
create policy "manage own blocks" on public.blocks
  for all to authenticated using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

drop policy if exists "file reports" on public.reports;
create policy "file reports" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());
drop policy if exists "see own reports" on public.reports;
create policy "see own reports" on public.reports
  for select to authenticated using (reporter_id = auth.uid());

-- ---------- The Discover feed ----------
-- Score = for each shared fandom, the lower of the two fan levels (1-3),
-- plus 1 for each fandom category you both have something in.
create or replace function public.discover_profiles(max_results int default 20)
returns table (
  id uuid, display_name text, age int, pronouns text, city text, badge_theme text,
  bio text, looking_for text, photo_path text, score int, shared_fandoms text[]
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select pp.id, pp.show_me, pp.appear_in, pp.age_min, pp.age_max,
           date_part('year', age(pp.birthdate))::int as my_age
    from public.profile_private pp
    join public.profiles p on p.id = pp.id
    where pp.id = auth.uid()
  ),
  filtered as (
    select o.id as cand, date_part('year', age(op.birthdate))::int as cand_age
    from public.profiles o
    join public.profile_private op on op.id = o.id
    cross join me
    where o.id <> me.id
      and not exists (select 1 from public.likes l where l.from_id = me.id and l.to_id = o.id)
      and not public.is_blocked_pair(me.id, o.id)
      and date_part('year', age(op.birthdate)) >= 18
      and date_part('year', age(op.birthdate))::int between me.age_min and me.age_max
      and me.my_age between op.age_min and op.age_max
      and ('everyone' = any (me.show_me) or me.show_me && op.appear_in)
      and ('everyone' = any (op.show_me) or op.show_me && me.appear_in)
  ),
  shared as (
    select f.cand, fd.name, least(mine.level, theirs.level) as pts
    from filtered f
    join public.profile_fandoms theirs on theirs.profile_id = f.cand
    join public.profile_fandoms mine on mine.fandom_id = theirs.fandom_id and mine.profile_id = auth.uid()
    join public.fandoms fd on fd.id = theirs.fandom_id
  ),
  my_cats as (
    select distinct fd.category from public.profile_fandoms pf
    join public.fandoms fd on fd.id = pf.fandom_id
    where pf.profile_id = auth.uid()
  ),
  cats as (
    select pf.profile_id as cand, count(distinct fd.category)::int as n
    from public.profile_fandoms pf
    join public.fandoms fd on fd.id = pf.fandom_id
    where pf.profile_id in (select cand from filtered)
      and fd.category in (select category from my_cats)
    group by pf.profile_id
  ),
  scored as (
    select f.cand, f.cand_age,
           coalesce((select sum(s.pts) from shared s where s.cand = f.cand), 0)::int
             + coalesce((select c.n from cats c where c.cand = f.cand), 0) as score,
           coalesce((select array_agg(s.name order by s.pts desc, s.name) from shared s where s.cand = f.cand), '{}') as shared_names
    from filtered f
  )
  select p.id, p.display_name, sc.cand_age, p.pronouns, p.city, p.badge_theme, p.bio, p.looking_for,
         (select ph.path from public.photos ph where ph.profile_id = p.id order by ph.position, ph.created_at limit 1),
         sc.score, sc.shared_names
  from scored sc
  join public.profiles p on p.id = sc.cand
  order by sc.score desc, p.created_at desc
  limit greatest(1, least(max_results, 50));
$$;

-- ---------- Like or pass. Returns true when it's a match. ----------
create or replace function public.record_swipe(target uuid, act text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null or target is null or target = me or act not in ('like', 'pass') then
    raise exception 'Invalid swipe';
  end if;
  if public.is_blocked_pair(me, target) then
    return false;
  end if;
  insert into public.likes (from_id, to_id, action)
  values (me, target, act)
  on conflict (from_id, to_id) do update set action = excluded.action, created_at = now();
  return act = 'like' and exists (
    select 1 from public.likes l where l.from_id = target and l.to_id = me and l.action = 'like'
  );
end;
$$;

-- ---------- My matches (mutual likes, minus blocks) ----------
create or replace function public.my_matches()
returns table (
  id uuid, display_name text, age int, city text, badge_theme text, photo_path text, matched_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.display_name, public.profile_age(p.id), p.city, p.badge_theme,
         (select ph.path from public.photos ph where ph.profile_id = p.id order by ph.position, ph.created_at limit 1),
         greatest(a.created_at, b.created_at)
  from public.likes a
  join public.likes b on b.from_id = a.to_id and b.to_id = a.from_id
  join public.profiles p on p.id = a.to_id
  where a.from_id = auth.uid() and a.action = 'like' and b.action = 'like'
    and not public.is_blocked_pair(auth.uid(), p.id)
  order by 7 desc;
$$;

-- ---------- Is this person one of my matches? ----------
create or replace function public.is_match(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.likes a
    join public.likes b on b.from_id = a.to_id and b.to_id = a.from_id
    where a.from_id = auth.uid() and a.to_id = other and a.action = 'like' and b.action = 'like'
  ) and not public.is_blocked_pair(auth.uid(), other);
$$;

-- ---------- Access for logged-in members (RLS above still applies) ----------
grant select, insert, update, delete on public.profile_private to authenticated;
grant select on public.likes to authenticated;
grant select, insert, delete on public.blocks to authenticated;
grant select, insert on public.reports to authenticated;

revoke all on function public.is_blocked_pair(uuid, uuid) from public;
revoke all on function public.discover_profiles(int) from public;
revoke all on function public.record_swipe(uuid, text) from public;
revoke all on function public.my_matches() from public;
revoke all on function public.is_match(uuid) from public;
grant execute on function public.is_blocked_pair(uuid, uuid) to authenticated;
grant execute on function public.discover_profiles(int) to authenticated;
grant execute on function public.record_swipe(uuid, text) to authenticated;
grant execute on function public.my_matches() to authenticated;
grant execute on function public.is_match(uuid) to authenticated;
