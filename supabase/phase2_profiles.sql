-- =====================================================================
-- The CON: Phase 2 (profiles, fandoms, badge themes, photos)
-- Run once in Supabase: SQL Editor > New query > paste all > Run.
-- Safe to re-run: it skips anything that already exists.
-- =====================================================================

-- ---------- Profiles: what other members can see ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  pronouns text check (char_length(pronouns) <= 40),
  gender_identity text check (char_length(gender_identity) <= 60),
  looking_for text check (char_length(looking_for) <= 120),
  city text check (char_length(city) <= 60),
  bio text check (char_length(bio) <= 600),
  con_weekend text check (char_length(con_weekend) <= 200),
  current_cosplay text check (char_length(current_cosplay) <= 120),
  play_style text check (char_length(play_style) <= 120),
  alignment text check (char_length(alignment) <= 20),
  hill_to_die_on text check (char_length(hill_to_die_on) <= 200),
  hyperfixation text check (char_length(hyperfixation) <= 120),
  badge_theme text not null default 'classic' check (badge_theme in (
    'classic','blue-box','hunters-road','raid-night','fursona','starship',
    'grimoire','neon-arcade','sakura','cape-cowl','haunted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Private details: only the owner can ever read these ----------
create table if not exists public.profile_private (
  id uuid primary key references public.profiles (id) on delete cascade,
  birthdate date not null
);

-- Lets others see someone's AGE without ever seeing their birthdate.
create or replace function public.profile_age(pid uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select date_part('year', age(birthdate))::int from public.profile_private where id = pid;
$$;
revoke all on function public.profile_age(uuid) from public;
grant execute on function public.profile_age(uuid) to authenticated;

-- ---------- Fandom list (the dropdowns) ----------
create table if not exists public.fandoms (
  id serial primary key,
  name text not null unique,
  category text not null,
  sort int not null default 0
);

-- ---------- Which fandoms each person picked, and how hard they stan ----------
-- level: 1 = casual, 2 = fan, 3 = superfan
create table if not exists public.profile_fandoms (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  fandom_id int not null references public.fandoms (id) on delete cascade,
  level smallint not null default 2 check (level between 1 and 3),
  primary key (profile_id, fandom_id)
);

-- ---------- Photos ----------
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  path text not null unique,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.fandoms enable row level security;
alter table public.profile_fandoms enable row level security;
alter table public.photos enable row level security;

drop policy if exists "members can view profiles" on public.profiles;
create policy "members can view profiles" on public.profiles
  for select to authenticated using (true);
drop policy if exists "create own profile" on public.profiles;
create policy "create own profile" on public.profiles
  for insert to authenticated with check (id = auth.uid());
drop policy if exists "edit own profile" on public.profiles;
create policy "edit own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "own private details only" on public.profile_private;
create policy "own private details only" on public.profile_private
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "members can view fandom list" on public.fandoms;
create policy "members can view fandom list" on public.fandoms
  for select to authenticated using (true);

drop policy if exists "members can view picked fandoms" on public.profile_fandoms;
create policy "members can view picked fandoms" on public.profile_fandoms
  for select to authenticated using (true);
drop policy if exists "manage own fandoms" on public.profile_fandoms;
create policy "manage own fandoms" on public.profile_fandoms
  for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists "members can view photos" on public.photos;
create policy "members can view photos" on public.photos
  for select to authenticated using (true);
drop policy if exists "manage own photos" on public.photos;
create policy "manage own photos" on public.photos
  for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ---------- Photo storage (private bucket, 5 MB, images only) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "members can view photo files" on storage.objects;
create policy "members can view photo files" on storage.objects
  for select to authenticated using (bucket_id = 'photos');
drop policy if exists "upload to own photo folder" on storage.objects;
create policy "upload to own photo folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "delete own photo files" on storage.objects;
create policy "delete own photo files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Starter fandoms (add more any time with another insert) ----------
insert into public.fandoms (name, category, sort) values
  -- TV & Film
  ('Supernatural', 'TV & Film', 1), ('Doctor Who', 'TV & Film', 2), ('Star Trek', 'TV & Film', 3),
  ('Star Wars', 'TV & Film', 4), ('Marvel Cinematic Universe', 'TV & Film', 5), ('DC Films & TV', 'TV & Film', 6),
  ('The Lord of the Rings', 'TV & Film', 7), ('Harry Potter', 'TV & Film', 8), ('Stranger Things', 'TV & Film', 9),
  ('The Witcher', 'TV & Film', 10), ('Game of Thrones / House of the Dragon', 'TV & Film', 11),
  ('Buffy the Vampire Slayer', 'TV & Film', 12), ('Firefly', 'TV & Film', 13), ('The X-Files', 'TV & Film', 14),
  ('Good Omens', 'TV & Film', 15), ('Sherlock', 'TV & Film', 16), ('The Expanse', 'TV & Film', 17),
  ('Battlestar Galactica', 'TV & Film', 18), ('Ghostbusters', 'TV & Film', 19), ('Jurassic Park', 'TV & Film', 20),
  ('Back to the Future', 'TV & Film', 21), ('The Boys', 'TV & Film', 22), ('Arcane', 'TV & Film', 23),
  -- Video Games
  ('World of Warcraft', 'Video Games', 1), ('Final Fantasy', 'Video Games', 2), ('The Legend of Zelda', 'Video Games', 3),
  ('Pokémon', 'Video Games', 4), ('Super Mario', 'Video Games', 5), ('Mass Effect', 'Video Games', 6),
  ('Dragon Age', 'Video Games', 7), ('The Elder Scrolls', 'Video Games', 8), ('Fallout', 'Video Games', 9),
  ('Halo', 'Video Games', 10), ('Kingdom Hearts', 'Video Games', 11), ('Overwatch', 'Video Games', 12),
  ('League of Legends', 'Video Games', 13), ('Minecraft', 'Video Games', 14), ('Baldur''s Gate 3', 'Video Games', 15),
  ('Animal Crossing', 'Video Games', 16), ('Destiny', 'Video Games', 17), ('Persona', 'Video Games', 18),
  ('Elden Ring / Dark Souls', 'Video Games', 19), ('Resident Evil', 'Video Games', 20), ('Street Fighter', 'Video Games', 21),
  ('Metroid', 'Video Games', 22), ('Stardew Valley', 'Video Games', 23), ('Retro Gaming', 'Video Games', 24),
  -- Tabletop
  ('Dungeons & Dragons', 'Tabletop', 1), ('Critical Role', 'Tabletop', 2), ('Dimension 20', 'Tabletop', 3),
  ('Pathfinder', 'Tabletop', 4), ('Warhammer 40K', 'Tabletop', 5), ('Magic: The Gathering', 'Tabletop', 6),
  ('Call of Cthulhu', 'Tabletop', 7), ('Vampire: The Masquerade', 'Tabletop', 8), ('Board Games', 'Tabletop', 9),
  -- Anime & Manga
  ('Naruto', 'Anime & Manga', 1), ('One Piece', 'Anime & Manga', 2), ('Dragon Ball', 'Anime & Manga', 3),
  ('My Hero Academia', 'Anime & Manga', 4), ('Attack on Titan', 'Anime & Manga', 5), ('Sailor Moon', 'Anime & Manga', 6),
  ('Demon Slayer', 'Anime & Manga', 7), ('Jujutsu Kaisen', 'Anime & Manga', 8), ('Neon Genesis Evangelion', 'Anime & Manga', 9),
  ('Cowboy Bebop', 'Anime & Manga', 10), ('Studio Ghibli', 'Anime & Manga', 11), ('Fullmetal Alchemist', 'Anime & Manga', 12),
  ('Spy x Family', 'Anime & Manga', 13), ('Chainsaw Man', 'Anime & Manga', 14),
  -- Comics
  ('Marvel Comics', 'Comics', 1), ('DC Comics', 'Comics', 2), ('Spider-Man', 'Comics', 3), ('X-Men', 'Comics', 4),
  ('Batman', 'Comics', 5), ('The Sandman', 'Comics', 6), ('Hellboy', 'Comics', 7), ('The Walking Dead', 'Comics', 8),
  -- Books
  ('Discworld', 'Books', 1), ('The Wheel of Time', 'Books', 2), ('Dune', 'Books', 3), ('The Cosmere', 'Books', 4),
  ('Percy Jackson', 'Books', 5), ('The Hitchhiker''s Guide to the Galaxy', 'Books', 6), ('A Court of Thorns and Roses', 'Books', 7),
  -- Communities & Hobbies
  ('Furry Fandom', 'Communities & Hobbies', 1), ('Cosplay', 'Communities & Hobbies', 2),
  ('Renaissance Faires', 'Communities & Hobbies', 3), ('LARP', 'Communities & Hobbies', 4),
  ('Steampunk', 'Communities & Hobbies', 5), ('Horror', 'Communities & Hobbies', 6),
  ('Theme Parks', 'Communities & Hobbies', 7), ('Cryptids', 'Communities & Hobbies', 8)
on conflict (name) do nothing;
