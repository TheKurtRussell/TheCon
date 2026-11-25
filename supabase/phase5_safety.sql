-- =====================================================================
-- The CON: Phase 5 (moderation, suspensions, verification, account deletion)
-- Run once in Supabase: SQL Editor > New query > paste all > Run.
-- Needs Phases 2-4 first. Safe to re-run.
--
-- To make yourself a moderator afterwards, run (with your login email):
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'you@example.com'
--   on conflict do nothing;
-- =====================================================================

-- ---------- Moderators ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security; -- no policies: hidden

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------- Suspended accounts ----------
create table if not exists public.suspensions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  reason text check (char_length(reason) <= 500),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.suspensions enable row level security; -- no policies: hidden

-- ---------- Verified badges ----------
-- Written only by moderators (or later an ID-verification provider).
-- Never stores ID images: just who, when and how.
create table if not exists public.verifications (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  method text not null default 'manual' check (method in ('manual', 'provider')),
  verified_by uuid references auth.users (id) on delete set null,
  verified_at timestamptz not null default now()
);
alter table public.verifications enable row level security;
drop policy if exists "members can see who is verified" on public.verifications;
create policy "members can see who is verified" on public.verifications
  for select to authenticated using (true);

-- ---------- Moderator notes on reports ----------
alter table public.reports
  add column if not exists mod_note text check (char_length(mod_note) <= 1000),
  add column if not exists reviewed_by uuid references auth.users (id) on delete set null,
  add column if not exists reviewed_at timestamptz;

-- ---------- Hide blocked AND suspended people everywhere ----------
-- Every page, the Discover feed, matches and duels already check this
-- function, so a suspension takes effect app-wide at once.
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
  ) or exists (
    select 1 from public.suspensions where user_id = a or user_id = b
  );
$$;

create or replace function public.am_i_suspended()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.suspensions where user_id = auth.uid());
$$;

-- ---------- Moderator tools ----------
create or replace function public.admin_reports(show_closed boolean default false)
returns table (
  id uuid, created_at timestamptz, reason text, details text, status text, mod_note text,
  reporter_id uuid, reporter_name text,
  target_id uuid, target_name text, target_city text, target_bio text,
  target_report_count int, target_suspended boolean, target_verified boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'Moderators only';
  end if;
  return query
  select r.id, r.created_at, r.reason, r.details, r.status, r.mod_note,
         r.reporter_id, rp.display_name,
         r.target_id, tp.display_name, tp.city, tp.bio,
         (select count(*)::int from public.reports x where x.target_id = r.target_id),
         exists (select 1 from public.suspensions s where s.user_id = r.target_id),
         exists (select 1 from public.verifications v where v.user_id = r.target_id)
  from public.reports r
  left join public.profiles rp on rp.id = r.reporter_id
  left join public.profiles tp on tp.id = r.target_id
  where show_closed or r.status <> 'closed'
  order by (r.reason = 'underage') desc, r.created_at desc
  limit 200;
end;
$$;

create or replace function public.admin_update_report(rid uuid, new_status text, note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Moderators only';
  end if;
  if new_status not in ('open', 'reviewing', 'closed') then
    raise exception 'Unknown status';
  end if;
  update public.reports
  set status = new_status,
      mod_note = nullif(left(trim(coalesce(note, '')), 1000), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = rid;
end;
$$;

create or replace function public.admin_set_suspended(uid uuid, suspend boolean, why text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Moderators only';
  end if;
  if suspend then
    insert into public.suspensions (user_id, reason, created_by)
    values (uid, nullif(left(trim(coalesce(why, '')), 500), ''), auth.uid())
    on conflict (user_id) do update set reason = excluded.reason, created_by = excluded.created_by, created_at = now();
  else
    delete from public.suspensions where user_id = uid;
  end if;
end;
$$;

create or replace function public.admin_set_verified(uid uuid, verified boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Moderators only';
  end if;
  if verified then
    insert into public.verifications (user_id, method, verified_by)
    values (uid, 'manual', auth.uid())
    on conflict (user_id) do update set verified_by = excluded.verified_by, verified_at = now();
  else
    delete from public.verifications where user_id = uid;
  end if;
end;
$$;

-- ---------- Delete my account ----------
-- Removes the login; everything else (profile, fandoms, likes, duels...)
-- is deleted automatically through "on delete cascade". The app removes
-- photo files from storage first.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not logged in';
  end if;
  delete from auth.users where id = me;
end;
$$;

-- ---------- Access ----------
grant select on public.verifications to authenticated;

revoke all on function public.is_admin() from public;
revoke all on function public.am_i_suspended() from public;
revoke all on function public.admin_reports(boolean) from public;
revoke all on function public.admin_update_report(uuid, text, text) from public;
revoke all on function public.admin_set_suspended(uuid, boolean, text) from public;
revoke all on function public.admin_set_verified(uuid, boolean) from public;
revoke all on function public.delete_my_account() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.am_i_suspended() to authenticated;
grant execute on function public.admin_reports(boolean) to authenticated;
grant execute on function public.admin_update_report(uuid, text, text) to authenticated;
grant execute on function public.admin_set_suspended(uuid, boolean, text) to authenticated;
grant execute on function public.admin_set_verified(uuid, boolean) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
