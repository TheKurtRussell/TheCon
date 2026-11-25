-- =====================================================================
-- The CON: Phase 4 (Fandom Trivia Duel + "Likes sent")
-- Run once in Supabase: SQL Editor > New query > paste all > Run.
-- Needs Phases 2 and 3 first. Safe to re-run.
-- =====================================================================

-- ---------- Trivia questions (answers are never sent to the browser early) ----------
-- fandom_id null = general geek question, used to fill a duel when two
-- people don't share enough fandoms. answer_index is 0-3.
create table if not exists public.trivia_questions (
  id serial primary key,
  fandom_id int references public.fandoms (id) on delete set null,
  question text not null unique,
  choices text[] not null check (array_length(choices, 1) = 4),
  answer_index smallint not null check (answer_index between 0 and 3)
);
-- No policies and no grants: members can't read this table directly.
alter table public.trivia_questions enable row level security;

-- ---------- Duels between two matches ----------
create table if not exists public.duels (
  id uuid primary key default gen_random_uuid(),
  player_a uuid not null references public.profiles (id) on delete cascade,
  player_b uuid not null references public.profiles (id) on delete cascade,
  question_ids int[] not null,
  status text not null default 'active' check (status in ('active', 'done')),
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  check (player_a <> player_b)
);
create index if not exists duels_players_idx on public.duels (player_a, player_b);

create table if not exists public.duel_answers (
  duel_id uuid not null references public.duels (id) on delete cascade,
  player_id uuid not null references public.profiles (id) on delete cascade,
  idx smallint not null,
  choice smallint not null check (choice between 0 and 3),
  correct boolean not null,
  answered_at timestamptz not null default now(),
  primary key (duel_id, player_id, idx)
);

alter table public.duels enable row level security;
alter table public.duel_answers enable row level security;
-- Everything goes through the functions below; no direct table access.

-- ---------- Start a duel with a match (or continue the current one) ----------
create or replace function public.start_duel(other uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  existing uuid;
  picked int[];
  new_id uuid;
begin
  if me is null or other is null or not public.is_match(other) then
    raise exception 'You can only duel your matches';
  end if;

  select d.id into existing from public.duels d
  where d.status = 'active'
    and ((d.player_a = me and d.player_b = other) or (d.player_a = other and d.player_b = me))
  order by d.created_at desc limit 1;
  if existing is not null then
    return existing;
  end if;

  -- Up to 5 questions from fandoms you both picked...
  picked := array(
    select t.id from public.trivia_questions t
    where t.fandom_id in (
      select a.fandom_id from public.profile_fandoms a
      join public.profile_fandoms b on b.fandom_id = a.fandom_id and b.profile_id = other
      where a.profile_id = me
    )
    order by random() limit 5
  );
  -- ...topped up with general geek questions, then anything else.
  if coalesce(array_length(picked, 1), 0) < 5 then
    picked := picked || array(
      select t.id from public.trivia_questions t
      where not (t.id = any (picked))
      order by (t.fandom_id is null) desc, random()
      limit 5 - coalesce(array_length(picked, 1), 0)
    );
  end if;

  insert into public.duels (player_a, player_b, question_ids)
  values (me, other, picked)
  returning id into new_id;
  return new_id;
end;
$$;

-- ---------- Everything the duel page needs (answers only once earned) ----------
create or replace function public.get_duel(did uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  d public.duels%rowtype;
  other uuid;
begin
  select * into d from public.duels where id = did;
  if not found or me is null or me not in (d.player_a, d.player_b) then
    return null;
  end if;
  other := case when me = d.player_a then d.player_b else d.player_a end;
  if public.is_blocked_pair(me, other) then
    return null;
  end if;

  return jsonb_build_object(
    'id', d.id,
    'status', d.status,
    'other_id', other,
    'other_name', (select p.display_name from public.profiles p where p.id = other),
    'total', array_length(d.question_ids, 1),
    'my_count', (select count(*) from public.duel_answers a where a.duel_id = did and a.player_id = me),
    'their_count', (select count(*) from public.duel_answers a where a.duel_id = did and a.player_id = other),
    'my_score', (select count(*) from public.duel_answers a where a.duel_id = did and a.player_id = me and a.correct),
    'their_score', case when d.status = 'done' then
      (select count(*) from public.duel_answers a where a.duel_id = did and a.player_id = other and a.correct) end,
    'questions', (
      select jsonb_agg(jsonb_build_object(
        'idx', q.ord - 1,
        'question', t.question,
        'choices', t.choices,
        'fandom', f.name,
        'my_choice', mine.choice,
        'answer', case when mine.choice is not null or d.status = 'done' then t.answer_index end,
        'their_choice', case when d.status = 'done' then theirs.choice end
      ) order by q.ord)
      from unnest(d.question_ids) with ordinality as q (qid, ord)
      join public.trivia_questions t on t.id = q.qid
      left join public.fandoms f on f.id = t.fandom_id
      left join public.duel_answers mine on mine.duel_id = did and mine.player_id = me and mine.idx = q.ord - 1
      left join public.duel_answers theirs on theirs.duel_id = did and theirs.player_id = other and theirs.idx = q.ord - 1
    )
  );
end;
$$;

-- ---------- Answer the next question ----------
create or replace function public.answer_question(did uuid, qidx int, pick int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  d public.duels%rowtype;
  other uuid;
  n int;
  ans smallint;
  ok boolean;
begin
  select * into d from public.duels where id = did for update;
  if not found or me is null or me not in (d.player_a, d.player_b) or d.status <> 'active' then
    raise exception 'This duel is not open for you';
  end if;
  other := case when me = d.player_a then d.player_b else d.player_a end;
  if public.is_blocked_pair(me, other) then
    raise exception 'This duel is not open for you';
  end if;
  if pick is null or pick < 0 or pick > 3 then
    raise exception 'Pick one of the four answers';
  end if;

  select count(*) into n from public.duel_answers a where a.duel_id = did and a.player_id = me;
  if qidx is distinct from n or n >= array_length(d.question_ids, 1) then
    raise exception 'Answer the questions in order';
  end if;

  select t.answer_index into ans from public.trivia_questions t where t.id = d.question_ids[qidx + 1];
  ok := pick = ans;
  insert into public.duel_answers (duel_id, player_id, idx, choice, correct)
  values (did, me, qidx, pick, ok);

  if (select count(*) from public.duel_answers a where a.duel_id = did) >= 2 * array_length(d.question_ids, 1) then
    update public.duels set status = 'done', finished_at = now() where id = did;
  end if;

  return jsonb_build_object('correct', ok, 'answer', ans);
end;
$$;

-- ---------- Latest duel with a match (for their profile page) ----------
create or replace function public.duel_with(other uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', d.id,
    'status', d.status,
    'my_count', (select count(*) from public.duel_answers a where a.duel_id = d.id and a.player_id = auth.uid()),
    'their_count', (select count(*) from public.duel_answers a where a.duel_id = d.id and a.player_id = other)
  )
  from public.duels d
  where ((d.player_a = auth.uid() and d.player_b = other) or (d.player_a = other and d.player_b = auth.uid()))
    and not public.is_blocked_pair(auth.uid(), other)
  order by d.created_at desc
  limit 1;
$$;

-- ---------- Likes I've sent that haven't been returned yet ----------
create or replace function public.my_likes_sent()
returns table (id uuid, display_name text, badge_theme text, liked_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.display_name, p.badge_theme, a.created_at
  from public.likes a
  join public.profiles p on p.id = a.to_id
  where a.from_id = auth.uid() and a.action = 'like'
    and not exists (
      select 1 from public.likes b where b.from_id = a.to_id and b.to_id = a.from_id and b.action = 'like'
    )
    and not public.is_blocked_pair(auth.uid(), a.to_id)
  order by a.created_at desc;
$$;

revoke all on function public.start_duel(uuid) from public;
revoke all on function public.get_duel(uuid) from public;
revoke all on function public.answer_question(uuid, int, int) from public;
revoke all on function public.duel_with(uuid) from public;
revoke all on function public.my_likes_sent() from public;
grant execute on function public.start_duel(uuid) to authenticated;
grant execute on function public.get_duel(uuid) to authenticated;
grant execute on function public.answer_question(uuid, int, int) to authenticated;
grant execute on function public.duel_with(uuid) to authenticated;
grant execute on function public.my_likes_sent() to authenticated;

-- ---------- Starter questions (add more any time) ----------
insert into public.trivia_questions (fandom_id, question, choices, answer_index)
select f.id, q.question, q.choices, q.answer_index
from (values
  -- TV & Film
  ('Supernatural', 'What car do Sam and Dean Winchester drive?', array['1969 Dodge Charger', '1967 Chevrolet Impala', '1970 Ford Mustang', '1965 Pontiac GTO'], 1),
  ('Supernatural', 'Which angel pulls Dean out of Hell?', array['Castiel', 'Gabriel', 'Uriel', 'Balthazar'], 0),
  ('Supernatural', 'Which mentor calls the Winchesters "idjits"?', array['Rufus Turner', 'Ash', 'Garth', 'Bobby Singer'], 3),
  ('Doctor Who', 'What does TARDIS stand for?', array['Time And Radial Distance In Space', 'Temporal Array for Rapid Displacement In Space', 'Time And Relative Dimension In Space', 'Time Abnormality Research Device In Space'], 2),
  ('Doctor Who', 'What is the Doctor''s home planet?', array['Gallifrey', 'Skaro', 'Mondas', 'Trenzalore'], 0),
  ('Doctor Who', 'Which villains are famous for shouting "Exterminate!"?', array['Cybermen', 'Sontarans', 'Weeping Angels', 'Daleks'], 3),
  ('Star Trek', 'What is the registry number of Kirk''s USS Enterprise?', array['NCC-1701', 'NCC-74656', 'NX-01', 'NCC-1864'], 0),
  ('Star Trek', 'Spock''s father, Sarek, is from which planet?', array['Romulus', 'Vulcan', 'Bajor', 'Qo''noS'], 1),
  ('Star Trek', 'What one-word order does Captain Picard give to go to warp?', array['Punch it!', 'Go!', 'Engage!', 'Launch!'], 2),
  ('Star Wars', 'Who is Luke Skywalker''s father?', array['Obi-Wan Kenobi', 'Emperor Palpatine', 'Yoda', 'Darth Vader'], 3),
  ('Star Wars', 'What is the name of Han Solo''s ship?', array['Slave I', 'Ghost', 'Millennium Falcon', 'Tantive IV'], 2),
  ('Star Wars', 'Which desert planet is Luke Skywalker''s childhood home?', array['Tatooine', 'Jakku', 'Hoth', 'Dagobah'], 0),
  ('Marvel Cinematic Universe', 'What is the name of Thor''s hammer?', array['Stormbreaker', 'Mjolnir', 'Gungnir', 'Jarnbjorn'], 1),
  ('Marvel Cinematic Universe', 'Which film started the Marvel Cinematic Universe in 2008?', array['The Incredible Hulk', 'Thor', 'Iron Man', 'Captain America: The First Avenger'], 2),
  ('Marvel Cinematic Universe', 'What rare metal is Wakanda famous for?', array['Vibranium', 'Adamantium', 'Uru', 'Carbonadium'], 0),
  ('The Lord of the Rings', 'What is the name of Bilbo''s sword?', array['Glamdring', 'Andúril', 'Sting', 'Narsil'], 2),
  ('The Lord of the Rings', 'Where must the One Ring be destroyed?', array['Minas Tirith', 'Mount Doom', 'Isengard', 'Moria'], 1),
  ('The Lord of the Rings', 'What does Gandalf become after he returns from death?', array['Gandalf the White', 'Gandalf the Grey', 'Gandalf the Blue', 'Gandalf the Wise'], 0),
  ('Harry Potter', 'Which Hogwarts house is Harry sorted into?', array['Ravenclaw', 'Slytherin', 'Hufflepuff', 'Gryffindor'], 3),
  ('Harry Potter', 'What is the name of Harry''s owl?', array['Errol', 'Hedwig', 'Pigwidgeon', 'Fawkes'], 1),
  ('Harry Potter', 'Which platform does the Hogwarts Express leave from?', array['Platform 9¾', 'Platform 7½', 'Platform 10¼', 'Platform 8⅞'], 0),
  ('Stranger Things', 'What is the name of the town in Stranger Things?', array['Derry', 'Hawkins', 'Twin Peaks', 'Sunnydale'], 1),
  ('Stranger Things', 'Which frozen breakfast food does Eleven love?', array['Pancakes', 'Toaster pastries', 'Eggo waffles', 'French toast sticks'], 2),
  ('Stranger Things', 'What D&D monster do the kids name the first creature after?', array['Beholder', 'Mind Flayer', 'Lich', 'Demogorgon'], 3),
  ('The Witcher', 'What is Geralt of Rivia''s nickname?', array['The White Wolf', 'The Grey Fox', 'The Black Hound', 'The Red Hawk'], 0),
  ('The Witcher', 'What does Geralt always name his horse?', array['Epona', 'Shadowfax', 'Roach', 'Agro'], 2),
  ('Game of Thrones / House of the Dragon', 'What are the words of House Stark?', array['Fire and Blood', 'Hear Me Roar', 'Ours Is the Fury', 'Winter Is Coming'], 3),
  ('Buffy the Vampire Slayer', 'What town sits on top of the Hellmouth?', array['Sunnydale', 'Mystic Falls', 'Hawkins', 'Riverdale'], 0),
  ('Firefly', 'What is the name of Mal Reynolds''s ship?', array['Rocinante', 'Serenity', 'Bebop', 'Nostromo'], 1),
  ('The X-Files', 'Who are the two FBI agents at the heart of The X-Files?', array['Cooper and Truman', 'Doggett and Reyes', 'Mulder and Scully', 'Booth and Brennan'], 2),
  ('Ghostbusters', 'What is the name of the giant marshmallow man?', array['Stay Puft', 'Puffy Pete', 'Mallow Max', 'Sugar Sam'], 0),
  ('Back to the Future', 'How fast must the DeLorean go to time travel?', array['77 mph', '88 mph', '99 mph', '121 mph'], 1),
  ('Jurassic Park', 'What island is Jurassic Park built on?', array['Isla Sorna', 'Skull Island', 'Isla Nublar', 'Isla Nebula'], 2),
  -- Video Games
  ('World of Warcraft', 'Which faction do the orcs belong to?', array['Alliance', 'Horde', 'Scourge', 'Burning Legion'], 1),
  ('World of Warcraft', 'What is the human capital city?', array['Stormwind', 'Orgrimmar', 'Ironforge', 'Undercity'], 0),
  ('World of Warcraft', 'Which prince of Lordaeron became the Lich King?', array['Thrall', 'Varian Wrynn', 'Illidan Stormrage', 'Arthas Menethil'], 3),
  ('Final Fantasy', 'Who is the main hero of Final Fantasy VII?', array['Squall Leonhart', 'Tidus', 'Cloud Strife', 'Zidane Tribal'], 2),
  ('Final Fantasy', 'What is the big yellow bird you can ride in Final Fantasy?', array['Moogle', 'Cactuar', 'Chocobo', 'Tonberry'], 2),
  ('The Legend of Zelda', 'What is the name of the hero you play in Zelda games?', array['Link', 'Zelda', 'Ganon', 'Sheik'], 0),
  ('The Legend of Zelda', 'What kingdom are most Zelda games set in?', array['Termina', 'Hyrule', 'Koholint', 'Lorule'], 1),
  ('The Legend of Zelda', 'What is the name of Link''s fairy in Ocarina of Time?', array['Tatl', 'Midna', 'Navi', 'Fi'], 2),
  ('Pokémon', 'Which Pokémon is number 001 in the National Pokédex?', array['Pikachu', 'Charmander', 'Mew', 'Bulbasaur'], 3),
  ('Pokémon', 'What type is Pikachu?', array['Electric', 'Normal', 'Fire', 'Psychic'], 0),
  ('Pokémon', 'What is Ash Ketchum''s hometown?', array['Viridian City', 'Cerulean City', 'Saffron City', 'Pallet Town'], 3),
  ('Super Mario', 'What is the name of Mario''s brother?', array['Wario', 'Luigi', 'Toad', 'Yoshi'], 1),
  ('Super Mario', 'Who keeps kidnapping Princess Peach?', array['Bowser', 'Donkey Kong', 'King Boo', 'Kamek'], 0),
  ('Mass Effect', 'What is the last name of Mass Effect''s Commander?', array['Vakarian', 'Anderson', 'Shepard', 'Hackett'], 2),
  ('Mass Effect', 'What is the name of the Commander''s ship?', array['Tempest', 'Normandy', 'Destiny Ascension', 'Hammerhead'], 1),
  ('The Elder Scrolls', 'In Skyrim, what are you revealed to be?', array['Dragonborn', 'Nerevarine', 'Champion of Cyrodiil', 'Vestige'], 0),
  ('The Elder Scrolls', 'Finish the guard''s line: "I used to be an adventurer like you, then I took an…"', array['ale to the face', 'axe to the shield', 'arrow to the knee', 'oath to the Jarl'], 2),
  ('Fallout', 'What are Fallout''s underground shelters called?', array['Bunkers', 'Silos', 'Domes', 'Vaults'], 3),
  ('Fallout', 'What is the name of Vault-Tec''s thumbs-up mascot?', array['Pip-Boy', 'Vault Boy', 'Nuka Kid', 'Atom Man'], 1),
  ('Halo', 'What is the main hero of Halo called?', array['Master Chief', 'The Arbiter', 'Noble Six', 'Spartan Locke'], 0),
  ('Halo', 'What is the name of Master Chief''s AI companion?', array['EDI', 'GLaDOS', 'SHODAN', 'Cortana'], 3),
  ('Minecraft', 'What green mob sneaks up and explodes?', array['Zombie', 'Creeper', 'Enderman', 'Slime'], 1),
  ('Minecraft', 'Which dimension is home to the Ender Dragon?', array['The Nether', 'The Void', 'The End', 'The Aether'], 2),
  ('Animal Crossing', 'Which raccoon sells you your house on a loan?', array['Tom Nook', 'Blathers', 'K.K. Slider', 'Isabelle'], 0),
  ('Baldur''s Gate 3', 'What creatures put a tadpole in your brain at the start of Baldur''s Gate 3?', array['Beholders', 'Liches', 'Dragons', 'Mind flayers'], 3),
  ('Elden Ring / Dark Souls', 'What is the player character called in Elden Ring?', array['The Ashen One', 'The Tarnished', 'The Chosen Undead', 'The Hunter'], 1),
  ('Resident Evil', 'Which company is behind the T-virus in Resident Evil?', array['Aperture Science', 'Shinra', 'Umbrella Corporation', 'Weyland-Yutani'], 2),
  ('Street Fighter', 'What is Ryu''s famous fireball move called?', array['Hadouken', 'Shoryuken', 'Sonic Boom', 'Tatsumaki'], 0),
  ('Stardew Valley', 'Who leaves you the farm in Stardew Valley?', array['Your uncle', 'Mayor Lewis', 'Your grandpa', 'A wizard'], 2),
  ('Retro Gaming', 'What 1985 Nintendo console launched in North America?', array['Super Nintendo', 'Game Boy', 'Nintendo 64', 'Nintendo Entertainment System'], 3),
  ('Retro Gaming', 'How does the famous Konami Code begin?', array['Up, Up, Down, Down', 'Left, Right, Left, Right', 'A, B, A, B', 'Down, Down, Up, Up'], 0),
  -- Tabletop
  ('Dungeons & Dragons', 'Which die do you roll to attack in D&D?', array['d12', 'd20', 'd10', 'd6'], 1),
  ('Dungeons & Dragons', 'What usually happens when you roll a natural 20 on an attack?', array['A fumble', 'A critical hit', 'You gain advantage', 'You lose a turn'], 1),
  ('Dungeons & Dragons', 'Which floating monster is all eyes and eye-stalks?', array['Mind flayer', 'Owlbear', 'Gelatinous cube', 'Beholder'], 3),
  ('Critical Role', 'What was the name of the party in Critical Role''s first campaign?', array['The Mighty Nein', 'Bells Hells', 'Vox Machina', 'The Fellowship'], 2),
  ('Critical Role', 'Who is the Dungeon Master of Critical Role?', array['Matthew Mercer', 'Brennan Lee Mulligan', 'Sam Riegel', 'Travis Willingham'], 0),
  ('Warhammer 40K', 'Finish the line: "In the grim darkness of the far future, there is only…"', array['night', 'war', 'death', 'silence'], 1),
  ('Magic: The Gathering', 'How many colors of mana are there in Magic: The Gathering?', array['Four', 'Five', 'Six', 'Seven'], 1),
  ('Call of Cthulhu', 'Which author created Cthulhu?', array['Edgar Allan Poe', 'Stephen King', 'H. P. Lovecraft', 'Clark Ashton Smith'], 2),
  ('Board Games', 'Which of these is a resource in Catan?', array['Gold', 'Iron', 'Water', 'Wool'], 3),
  -- Anime & Manga
  ('Naruto', 'Which village is Naruto from?', array['The Hidden Leaf', 'The Hidden Sand', 'The Hidden Mist', 'The Hidden Cloud'], 0),
  ('Naruto', 'What is the name of the Nine-Tailed Fox sealed inside Naruto?', array['Shukaku', 'Kurama', 'Gyuki', 'Matatabi'], 1),
  ('One Piece', 'What does Luffy want to become?', array['The World''s Greatest Swordsman', 'A Marine Admiral', 'King of the Pirates', 'The Pirate Hunter'], 2),
  ('One Piece', 'What does Luffy''s Devil Fruit turn his body into?', array['Rubber', 'Smoke', 'Fire', 'Sand'], 0),
  ('Dragon Ball', 'What is Goku''s Saiyan birth name?', array['Vegeta', 'Raditz', 'Kakarot', 'Bardock'], 2),
  ('Attack on Titan', 'Who is the main character of Attack on Titan?', array['Levi Ackerman', 'Armin Arlert', 'Reiner Braun', 'Eren Yeager'], 3),
  ('Sailor Moon', 'What is the name of Usagi''s talking black cat?', array['Luna', 'Artemis', 'Diana', 'Jiji'], 0),
  ('Studio Ghibli', 'Which Studio Ghibli film features No-Face?', array['Howl''s Moving Castle', 'Spirited Away', 'Princess Mononoke', 'Ponyo'], 1),
  ('Cowboy Bebop', 'What is the name of Spike Spiegel''s personal ship?', array['Red Tail', 'Hammerhead', 'Bebop', 'Swordfish II'], 3),
  ('Fullmetal Alchemist', 'What is the name of Edward Elric''s younger brother?', array['Alphonse', 'Roy', 'Scar', 'Winry'], 0),
  ('Demon Slayer', 'What is the name of Tanjiro''s sister, who becomes a demon?', array['Kanao', 'Nezuko', 'Shinobu', 'Mitsuri'], 1),
  -- Comics
  ('Spider-Man', 'What is Spider-Man''s secret identity in the classic comics?', array['Miles Morales', 'Ben Reilly', 'Peter Parker', 'Eddie Brock'], 2),
  ('X-Men', 'Which telepath founded the X-Men?', array['Charles Xavier', 'Jean Grey', 'Emma Frost', 'Magneto'], 0),
  ('Batman', 'Which city does Batman protect?', array['Metropolis', 'Star City', 'Central City', 'Gotham City'], 3),
  ('Batman', 'What is the name of Batman''s loyal butler?', array['Jarvis', 'Alfred', 'Hobson', 'Cadbury'], 1),
  ('DC Comics', 'What is Superman''s home planet?', array['Krypton', 'Apokolips', 'Thanagar', 'Oa'], 0),
  -- Books
  ('The Hitchhiker''s Guide to the Galaxy', 'What is the Answer to the Ultimate Question of Life, the Universe, and Everything?', array['7', '13', '42', '101'], 2),
  ('Discworld', 'What does the Discworld ride through space on?', array['A giant whale', 'Four elephants on a giant turtle', 'A dragon''s back', 'Nothing at all'], 1),
  ('Dune', 'What is the spice in Dune also called?', array['Sapho', 'Melange', 'Kwisatz', 'Shai-Hulud'], 1),
  ('Dune', 'What is the desert planet at the center of Dune?', array['Caladan', 'Giedi Prime', 'Kaitain', 'Arrakis'], 3),
  ('The Wheel of Time', 'Who started writing The Wheel of Time?', array['Robert Jordan', 'Brandon Sanderson', 'George R. R. Martin', 'Terry Goodkind'], 0),
  ('The Cosmere', 'Which author created the Cosmere?', array['Patrick Rothfuss', 'Brandon Sanderson', 'Joe Abercrombie', 'Robin Hobb'], 1),
  ('Percy Jackson', 'Who is Percy Jackson''s father?', array['Zeus', 'Poseidon', 'Hades', 'Apollo'], 1),
  -- Communities & Hobbies
  ('Furry Fandom', 'What do furries call their animal character?', array['A fursona', 'A totem', 'A spirit sona', 'A mascot'], 0),
  ('Furry Fandom', 'Which big furry convention is held in Pittsburgh?', array['Midwest FurFest', 'Eurofurence', 'Anthrocon', 'Further Confusion'], 2),
  ('Cosplay', 'The word "cosplay" combines which two words?', array['Costume and play', 'Comic and display', 'Cosmetic and roleplay', 'Costume and display'], 0),
  ('Renaissance Faires', 'Which giant snack is a Renaissance faire classic?', array['Corn dog', 'Turkey leg', 'Funnel cake tower', 'Pretzel crown'], 1),
  ('LARP', 'What does LARP stand for?', array['Live Action Role-Play', 'Large Adventure Roleplay Party', 'Legendary Action Realm Play', 'Live Arena Roleplay Program'], 0),
  ('Steampunk', 'Steampunk is mostly inspired by which era?', array['Medieval', 'Victorian', 'Roaring Twenties', 'Space Age'], 1),
  ('Horror', 'Freddy Krueger haunts the dreams of kids on which street?', array['Maple Street', 'Oak Lane', 'Elm Street', 'Cedar Avenue'], 2),
  ('Cryptids', 'What is the Loch Ness Monster''s nickname?', array['Nessie', 'Lochie', 'Scotty', 'Lady Ness'], 0),
  -- General geek questions (fill-ins)
  (null, 'In gaming, what does "NPC" stand for?', array['New Player Class', 'Non-Player Character', 'Neutral Power Card', 'Next Player Choice'], 1),
  (null, 'In tabletop games, what does rolling a "nat 1" usually mean?', array['A critical success', 'A reroll', 'A critical failure', 'Double damage'], 2),
  (null, 'Which planet is known as the Red Planet?', array['Mars', 'Jupiter', 'Venus', 'Mercury'], 0),
  (null, 'In what year was the original Star Wars film released?', array['1975', '1977', '1980', '1983'], 1),
  (null, 'Who co-created Spider-Man with artist Steve Ditko?', array['Jack Kirby', 'Bob Kane', 'Chris Claremont', 'Stan Lee'], 3),
  (null, 'In online gaming, what does "GG" mean?', array['Good game', 'Get going', 'Go guard', 'Great gear'], 0),
  (null, 'Which company makes the PlayStation?', array['Nintendo', 'Microsoft', 'Sony', 'Sega'], 2),
  (null, 'What is the name of the computer in 2001: A Space Odyssey?', array['HAL 9000', 'Skynet', 'WOPR', 'MU-TH-UR 6000'], 0),
  (null, 'Which video game hero is a fast blue hedgehog?', array['Crash', 'Spyro', 'Sonic', 'Knuckles'], 2),
  (null, 'Which publisher owns Batman and Wonder Woman?', array['Marvel', 'DC', 'Image', 'Dark Horse'], 1),
  (null, 'What is the number 5 written in binary?', array['110', '111', '100', '101'], 3),
  (null, 'Which polyhedral die is shaped like a pyramid?', array['d4', 'd6', 'd8', 'd10'], 0),
  (null, 'How many blocks make up each Tetris piece?', array['Three', 'Four', 'Five', 'Six'], 1),
  (null, 'Who wrote Frankenstein?', array['Bram Stoker', 'Edgar Allan Poe', 'Mary Shelley', 'H. G. Wells'], 2),
  (null, 'Han Solo brags about making the Kessel Run in less than 12 what?', array['Hours', 'Light-years', 'Minutes', 'Parsecs'], 3),
  (null, 'What color is Pac-Man?', array['Yellow', 'Red', 'Blue', 'Green'], 0),
  (null, 'Which mythology does Thor come from?', array['Greek', 'Norse', 'Egyptian', 'Celtic'], 1),
  (null, 'In video games, what does "RPG" stand for?', array['Rapid Play Game', 'Real Player Group', 'Role-Playing Game', 'Random Power Generator'], 2),
  (null, 'What does a "1-Up" give you in classic video games?', array['An extra life', 'A power boost', 'A shield', 'A new level'], 0),
  (null, 'Which famous sci-fi phrase is the Vulcan greeting?', array['May the Force be with you', 'Live long and prosper', 'To infinity and beyond', 'So say we all'], 1)
) as q (fandom_name, question, choices, answer_index)
left join public.fandoms f on f.name = q.fandom_name
where q.fandom_name is null or f.id is not null
on conflict (question) do nothing;
