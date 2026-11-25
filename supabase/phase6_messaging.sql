-- =====================================================================
-- The CON: Phase 6 (messaging between matches)
-- Run once in Supabase: SQL Editor > New query > paste all > Run.
-- Needs Phases 2-5 first. Safe to re-run.
-- =====================================================================

create table if not exists public.messages (
  id bigserial primary key,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  kind text not null default 'text' check (kind in ('text', 'system')),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);
create index if not exists messages_pair_idx
  on public.messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), id);
create index if not exists messages_unread_idx on public.messages (recipient_id) where read_at is null;

-- Members can read their own conversations, unless one side blocked the
-- other or is suspended. Sending and marking read go through functions.
alter table public.messages enable row level security;
drop policy if exists "read own conversations" on public.messages;
create policy "read own conversations" on public.messages
  for select to authenticated
  using (
    auth.uid() in (sender_id, recipient_id)
    and not public.is_blocked_pair(sender_id, recipient_id)
  );
grant select on public.messages to authenticated;

-- ---------- Send a message (matches only, gently rate-limited) ----------
create or replace function public.send_message(to_id uuid, body text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  clean text := btrim(coalesce(body, ''));
  msg public.messages%rowtype;
begin
  if me is null or to_id is null or not public.is_match(to_id) then
    raise exception 'You can only message your matches';
  end if;
  if char_length(clean) = 0 then
    raise exception 'Type a message first';
  end if;
  if char_length(clean) > 2000 then
    raise exception 'Messages can be up to 2000 characters';
  end if;
  if (select count(*) from public.messages m
      where m.sender_id = me and m.kind = 'text' and m.created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Whoa, slow down! Try again in a minute.';
  end if;

  insert into public.messages (sender_id, recipient_id, body)
  values (me, to_id, clean)
  returning * into msg;
  return to_jsonb(msg);
end;
$$;

-- ---------- Mark everything from one match as read ----------
create or replace function public.mark_read(other uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.messages set read_at = now()
  where recipient_id = auth.uid() and sender_id = other and read_at is null;
$$;

-- ---------- Unread counts per match ----------
create or replace function public.unread_counts()
returns table (other_id uuid, unread int)
language sql
stable
security definer
set search_path = public
as $$
  select m.sender_id, count(*)::int
  from public.messages m
  where m.recipient_id = auth.uid() and m.read_at is null
    and public.is_match(m.sender_id)
  group by m.sender_id;
$$;

-- ---------- Post the duel result into the chat when a duel ends ----------
create or replace function public.post_duel_result()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  a_name text;
  b_name text;
  a_score int;
  b_score int;
begin
  select display_name into a_name from public.profiles where id = new.player_a;
  select display_name into b_name from public.profiles where id = new.player_b;
  select count(*) into a_score from public.duel_answers where duel_id = new.id and player_id = new.player_a and correct;
  select count(*) into b_score from public.duel_answers where duel_id = new.id and player_id = new.player_b and correct;

  insert into public.messages (sender_id, recipient_id, kind, body)
  values (
    new.player_a, new.player_b, 'system',
    'Trivia duel finished: ' || coalesce(a_name, 'Player 1') || ' ' || a_score || ' – ' || b_score || ' ' ||
    coalesce(b_name, 'Player 2') || '. ' ||
    case when a_score = b_score then 'It''s a tie! Split the snacks.'
         when a_score > b_score then coalesce(b_name, 'Player 2') || ' picks the snack!'
         else coalesce(a_name, 'Player 1') || ' picks the snack!' end
  );
  return new;
end;
$$;

drop trigger if exists duel_result_message on public.duels;
create trigger duel_result_message
  after update of status on public.duels
  for each row
  when (new.status = 'done' and old.status is distinct from 'done')
  execute function public.post_duel_result();

-- ---------- Live updates: let Supabase Realtime watch new messages ----------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
     ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

-- ---------- Access ----------
revoke all on function public.send_message(uuid, text) from public;
revoke all on function public.mark_read(uuid) from public;
revoke all on function public.unread_counts() from public;
revoke all on function public.post_duel_result() from public;
grant execute on function public.send_message(uuid, text) to authenticated;
grant execute on function public.mark_read(uuid) to authenticated;
grant execute on function public.unread_counts() to authenticated;
