-- wordGuesser schema v2. Run in Supabase SQL editor. Drops and recreates the games table.

drop table if exists games cascade;

create table games (
  game_code         text primary key,
  teams             int  not null check (teams between 2 and 4),
  grid              int  not null check (grid between 5 and 7),
  board_cards       jsonb not null,                 -- [{word, team, revealed}] team ∈ red|blue|green|cyan|neutral|black
  cards_left        jsonb not null,                 -- {"red":10,"blue":10,...}
  turn              text not null,                  -- team id whose turn it is
  guesses_remaining int  not null default 0,
  eliminated        text[] not null default '{}',   -- teams that revealed an assassin
  chat_log          jsonb not null default '[]'::jsonb,
  game_over         boolean not null default false,
  winner            text not null default '',       -- team id or ''
  game_mode         text not null default 'normal' check (game_mode in ('normal', 'suspense', 'easy', 'adult', 'sss')),
  host_name         text not null default '',
  timer_started     boolean not null default false,
  turn_seconds      int  not null default 0 check (turn_seconds between 0 and 600), -- 0 = untimed
  turn_started_at   timestamptz not null default now(), -- clock restarts on each new turn and on each hint
  turns_in_round    text[] not null default '{}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_games_updated_at on games (updated_at);

alter table games enable row level security;
create policy "anon read"   on games for select to anon using (true);
create policy "anon insert" on games for insert to anon with check (true);
-- Intentionally no update/delete policy: all mutations go through the functions below.

alter publication supabase_realtime add table games;

-- ---------- automatic cleanup of stale games ----------
-- Automatically purges games inactive for over 24 hours whenever a new game is created.
create or replace function cleanup_stale_games()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from games where updated_at < now() - interval '24 hours';
  return null;
end;
$$;

drop trigger if exists trg_cleanup_stale_games on games;
create trigger trg_cleanup_stale_games
  before insert on games
  for each statement
  execute function cleanup_stale_games();

-- Standalone purge function (can be called via RPC, manual SQL, or pg_cron)
create or replace function purge_old_games(p_hours int default 24)
returns int language plpgsql security definer set search_path = public as $$
declare
  deleted_count int;
begin
  delete from games where updated_at < now() - (p_hours || ' hours')::interval;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- ---------- helpers ----------
-- Next non-eliminated team after p_turn, in fixed order red→blue→green→cyan (wrapping).
create or replace function next_team(p_turn text, p_teams int, p_eliminated text[])
returns text language sql immutable as $$
  with ord as (
    select t, i from unnest((array['red','blue','green','cyan'])[1:p_teams]) with ordinality as u(t, i)
  )
  select t from ord
  where t <> all(p_eliminated)
  order by ((i - (select i from ord where t = p_turn) - 1 + p_teams) % p_teams) asc
  limit 1;
$$;

create or replace function remaining_teams(p_teams int, p_eliminated text[])
returns text[] language sql immutable as $$
  select coalesce(array_agg(t order by i), '{}')
  from unnest((array['red','blue','green','cyan'])[1:p_teams]) with ordinality as u(t, i)
  where t <> all(p_eliminated);
$$;

create or replace function derive_cards_left(p_cards jsonb)
returns jsonb language sql immutable as $$
  select coalesce(jsonb_object_agg(t, n), '{}'::jsonb)
  from (
    select c->>'team' as t, count(*) as n
    from jsonb_array_elements(p_cards) c
    where c->>'team' not in ('neutral','black')
    group by 1
  ) s;
$$;

-- ---------- advance_turn_cycle ----------
create or replace function advance_turn_cycle(g games)
returns games language plpgsql as $$
declare
  rem      text[];
  nt       text;
  winners  text[];
begin
  g.turns_in_round := array_append(g.turns_in_round, g.turn);
  rem := remaining_teams(g.teams, g.eliminated);
  nt := next_team(g.turn, g.teams, g.eliminated);

  -- Pass turns for any non-eliminated teams that already have 0 cards left
  while nt is not null and (g.cards_left ->> nt)::int = 0 and not (rem <@ g.turns_in_round) loop
    g.turns_in_round := array_append(g.turns_in_round, nt);
    g.chat_log := g.chat_log || jsonb_build_object('type','system','text', upper(nt) || ' has cleared all cards and passes.');
    if rem <@ g.turns_in_round then exit; end if;
    nt := next_team(nt, g.teams, g.eliminated);
  end loop;

  -- If every active team has completed a turn in this round, check if anyone won!
  if rem <@ g.turns_in_round then
    select array_agg(t order by i) into winners
    from unnest((array['red','blue','green','cyan'])[1:g.teams]) with ordinality as u(t, i)
    where t <> all(g.eliminated) and (g.cards_left ->> t)::int = 0;

    if winners is not null and cardinality(winners) > 0 then
      g.game_over := true;
      g.winner := array_to_string(winners, ', ');
      if cardinality(winners) = 1 then
        g.chat_log := g.chat_log || jsonb_build_object('type','system','text', upper(winners[1]) || ' wins!');
      else
        g.chat_log := g.chat_log || jsonb_build_object('type','system','text', upper(array_to_string(winners, ' & ')) || ' win! (TIE)');
      end if;
      select jsonb_agg(c || '{"revealed":true}'::jsonb order by o) into g.board_cards
        from jsonb_array_elements(g.board_cards) with ordinality as t(c, o);
      g.guesses_remaining := 0;
      return g;
    end if;

    -- No winner yet; reset turns_in_round for the next round
    g.turns_in_round := '{}';
  end if;

  g.turn := nt;
  g.guesses_remaining := 0;
  g.chat_log := g.chat_log || jsonb_build_object('type','system','text', upper(nt) || ' team''s turn');
  return g;
end $$;

-- ---------- reveal_card ----------
create or replace function reveal_card(p_code text, p_team text, p_index int)
returns games language plpgsql security definer set search_path = public as $$
declare
  g    games;
  card jsonb;
  ct   text;
  rem  text[];
  old_turn text;
begin
  select * into g from games where game_code = p_code for update;
  if not found then raise exception 'Game not found'; end if;
  old_turn := g.turn;
  if g.game_over then raise exception 'Game is over'; end if;
  if g.turn <> p_team then raise exception 'Not your turn'; end if;
  if g.guesses_remaining <= 0 then raise exception 'Wait for a hint'; end if;
  if p_index < 0 or p_index >= jsonb_array_length(g.board_cards) then raise exception 'Bad card'; end if;

  card := g.board_cards -> p_index;
  if (card ->> 'revealed')::boolean then raise exception 'Already revealed'; end if;
  ct := card ->> 'team';

  g.board_cards := jsonb_set(g.board_cards, array[p_index::text, 'revealed'], 'true'::jsonb);
  g.guesses_remaining := g.guesses_remaining - 1;

  if ct = 'black' then
    g.eliminated := array_append(g.eliminated, p_team);
    g.chat_log := g.chat_log || jsonb_build_object(
      'type','system','text', upper(p_team) || ' revealed an assassin and is eliminated!');
    rem := remaining_teams(g.teams, g.eliminated);
    if cardinality(rem) <= 1 then
      g.game_over := true;
      g.winner := coalesce(rem[1], '');
      g.chat_log := g.chat_log || jsonb_build_object('type','system','text', upper(g.winner) || ' wins!');
      select jsonb_agg(c || '{"revealed":true}'::jsonb order by o) into g.board_cards
        from jsonb_array_elements(g.board_cards) with ordinality as t(c, o);
    else
      g := advance_turn_cycle(g);
    end if;
  else
    if ct <> 'neutral' then
      g.cards_left := jsonb_set(g.cards_left, array[ct], to_jsonb((g.cards_left ->> ct)::int - 1));
    end if;
    if (g.cards_left ->> p_team)::int = 0 or g.guesses_remaining = 0 then
      g := advance_turn_cycle(g);
    end if;
  end if;

  if g.turn <> old_turn then
    g.turn_started_at := now();
  end if;

  update games set
    board_cards = g.board_cards, cards_left = g.cards_left, turn = g.turn,
    guesses_remaining = g.guesses_remaining, eliminated = g.eliminated, chat_log = g.chat_log,
    game_over = g.game_over, winner = g.winner, turns_in_round = g.turns_in_round, updated_at = now(),
    turn_started_at = case when g.turn <> old_turn then now() else turn_started_at end
  where game_code = p_code
  returning * into g;
  return g;
end $$;

-- ---------- reveal_cards_batch (for suspense mode) ----------
create or replace function reveal_cards_batch(p_code text, p_team text, p_indices int[])
returns games language plpgsql security definer set search_path = public as $$
declare
  g              games;
  card           jsonb;
  ct             text;
  idx            int;
  rem            text[];
  has_assassin   boolean := false;
  old_turn       text;
begin
  select * into g from games where game_code = p_code for update;
  if not found then raise exception 'Game not found'; end if;
  old_turn := g.turn;
  if g.game_over then raise exception 'Game is over'; end if;
  if g.turn <> p_team then raise exception 'Not your turn'; end if;
  if g.guesses_remaining <= 0 then raise exception 'Wait for a hint'; end if;
  if p_indices is null or cardinality(p_indices) < 1 then raise exception 'Must select at least 1 card'; end if;
  if cardinality(p_indices) > g.guesses_remaining then raise exception 'Cannot select more than remaining guesses'; end if;
  if (select count(distinct x) from unnest(p_indices) x) <> cardinality(p_indices) then
    raise exception 'Duplicate cards selected';
  end if;

  -- Validate all indices and unrevealed status before modifying
  foreach idx in array p_indices loop
    if idx < 0 or idx >= jsonb_array_length(g.board_cards) then raise exception 'Bad card'; end if;
    card := g.board_cards -> idx;
    if (card ->> 'revealed')::boolean then raise exception 'Already revealed'; end if;
  end loop;

  -- Apply reveals
  foreach idx in array p_indices loop
    card := g.board_cards -> idx;
    ct := card ->> 'team';
    g.board_cards := jsonb_set(g.board_cards, array[idx::text, 'revealed'], 'true'::jsonb);
    g.guesses_remaining := g.guesses_remaining - 1;

    if ct = 'black' then
      has_assassin := true;
    elsif ct <> 'neutral' then
      g.cards_left := jsonb_set(g.cards_left, array[ct], to_jsonb((g.cards_left ->> ct)::int - 1));
    end if;
  end loop;

  if has_assassin then
    g.eliminated := array_append(g.eliminated, p_team);
    g.chat_log := g.chat_log || jsonb_build_object(
      'type','system','text', upper(p_team) || ' revealed an assassin and is eliminated!');
    rem := remaining_teams(g.teams, g.eliminated);
    if cardinality(rem) <= 1 then
      g.game_over := true;
      g.winner := coalesce(rem[1], '');
      g.chat_log := g.chat_log || jsonb_build_object('type','system','text', upper(g.winner) || ' wins!');
      select jsonb_agg(c || '{"revealed":true}'::jsonb order by o) into g.board_cards
        from jsonb_array_elements(g.board_cards) with ordinality as t(c, o);
    else
      g := advance_turn_cycle(g);
    end if;
  else
    g := advance_turn_cycle(g);
  end if;

  if g.turn <> old_turn then
    g.turn_started_at := now();
  end if;

  update games set
    board_cards = g.board_cards, cards_left = g.cards_left, turn = g.turn,
    guesses_remaining = g.guesses_remaining, eliminated = g.eliminated, chat_log = g.chat_log,
    game_over = g.game_over, winner = g.winner, turns_in_round = g.turns_in_round, updated_at = now(),
    turn_started_at = case when g.turn <> old_turn then now() else turn_started_at end
  where game_code = p_code
  returning * into g;
  return g;
end $$;

-- ---------- give_hint ----------
create or replace function give_hint(p_code text, p_team text, p_word text, p_n int)
returns games language plpgsql security definer set search_path = public as $$
declare g games; w text; max_n int;
begin
  select * into g from games where game_code = p_code for update;
  if not found then raise exception 'Game not found'; end if;
  if g.game_over then raise exception 'Game is over'; end if;
  if g.turn <> p_team then raise exception 'Not your turn'; end if;
  if g.guesses_remaining > 0 then raise exception 'Your team still has guesses'; end if;

  w := upper(trim(p_word));
  if w !~ '^[A-Z][A-Z''-]{0,14}$' then raise exception 'Hint must be one word, letters only, max 15 characters'; end if;
  max_n := (g.cards_left ->> p_team)::int;
  if p_n is null or p_n < 1 or p_n > max_n then raise exception 'Number must be between 1 and %', max_n; end if;
  if exists (select 1 from jsonb_array_elements(g.board_cards) c where upper(c ->> 'word') = w) then
    raise exception 'Hint cannot be a word on the board';
  end if;

  update games set
    guesses_remaining = p_n, turn_started_at = now(),
    chat_log = chat_log || jsonb_build_object('type','hint','team',p_team,'text', w || ' - ' || p_n),
    updated_at = now()
  where game_code = p_code
  returning * into g;
  return g;
end $$;

-- ---------- end_turn ----------
create or replace function end_turn(p_code text, p_team text)
returns games language plpgsql security definer set search_path = public as $$
declare g games;
begin
  select * into g from games where game_code = p_code for update;
  if not found then raise exception 'Game not found'; end if;
  if g.game_over then raise exception 'Game is over'; end if;
  if g.turn <> p_team then raise exception 'Not your turn'; end if;
  g := advance_turn_cycle(g);
  update games set
    board_cards = g.board_cards, cards_left = g.cards_left, turn = g.turn,
    guesses_remaining = g.guesses_remaining, eliminated = g.eliminated, chat_log = g.chat_log,
    game_over = g.game_over, winner = g.winner, turns_in_round = g.turns_in_round,
    turn_started_at = now(), updated_at = now()
  where game_code = p_code
  returning * into g;
  return g;
end $$;

-- ---------- timeout_turn (anyone may call; only acts once the turn clock has run out) ----------
create or replace function timeout_turn(p_code text)
returns games language plpgsql security definer set search_path = public as $$
declare g games;
begin
  select * into g from games where game_code = p_code for update;
  if not found then raise exception 'Game not found'; end if;
  if not g.timer_started or g.game_over or g.turn_seconds = 0 or now() < g.turn_started_at + make_interval(secs => g.turn_seconds) then
    return g; -- nothing to do; callers just get the current row
  end if;
  g.chat_log := g.chat_log || jsonb_build_object('type','system','text', upper(g.turn) || ' ran out of time');
  g := advance_turn_cycle(g);
  update games set
    board_cards = g.board_cards, cards_left = g.cards_left, turn = g.turn,
    guesses_remaining = g.guesses_remaining, eliminated = g.eliminated, chat_log = g.chat_log,
    game_over = g.game_over, winner = g.winner, turns_in_round = g.turns_in_round,
    turn_started_at = now(), updated_at = now()
  where game_code = p_code
  returning * into g;
  return g;
end $$;

-- ---------- send_chat (guessers only; role is client-asserted) ----------
create or replace function send_chat(p_code text, p_team text, p_name text, p_text text)
returns games language plpgsql security definer set search_path = public as $$
declare g games; t text;
begin
  t := trim(p_text);
  if t is null or length(t) = 0 then raise exception 'Empty message'; end if;
  if length(t) > 200 then raise exception 'Message too long (max 200)'; end if;
  if p_team not in ('red','blue','green','cyan') then raise exception 'Bad team'; end if;
  update games set
    chat_log = chat_log || jsonb_build_object(
      'type','chat','team',p_team,'name', left(coalesce(nullif(trim(p_name),''),'Anonymous'), 20),'text', t),
    updated_at = now()
  where game_code = p_code
  returning * into g;
  if not found then raise exception 'Game not found'; end if;
  return g;
end $$;

-- ---------- restart_game ----------
create or replace function restart_game(p_code text, p_cards jsonb, p_start_team text default null)
returns games language plpgsql security definer set search_path = public as $$
declare g games; left_ jsonb; start_team text;
begin
  select * into g from games where game_code = p_code for update;
  if not found then raise exception 'Game not found'; end if;
  if jsonb_array_length(p_cards) <> g.grid * g.grid then raise exception 'Board must have % cards', g.grid * g.grid; end if;
  if (select count(*) from jsonb_array_elements(p_cards) c where c->>'team' = 'black') <> g.teams - 1 then raise exception 'Board must have % assassins', g.teams - 1; end if;
  left_ := derive_cards_left(p_cards);
  if (select count(*) from jsonb_object_keys(left_)) <> g.teams then raise exception 'Board must contain % teams', g.teams; end if;

  if p_start_team is not null and p_start_team = any((array['red','blue','green','cyan'])[1:g.teams]) then
    start_team := p_start_team;
  else
    start_team := (array['red','blue','green','cyan'])[1 + floor(random() * g.teams)::int];
  end if;

  update games set
    board_cards = p_cards, cards_left = left_, turn = start_team, guesses_remaining = 0, eliminated = '{}',
    chat_log = jsonb_build_array(jsonb_build_object('type','system','text','Game restarted! ' || upper(start_team) || ' starts.')),
    game_over = false, winner = '', updated_at = now(), turn_started_at = now(),
    timer_started = false, turns_in_round = '{}'
  where game_code = p_code
  returning * into g;
  return g;
end $$;

-- ---------- start_timer ----------
create or replace function start_timer(p_code text)
returns games language plpgsql security definer set search_path = public as $$
declare g games;
begin
  select * into g from games where game_code = p_code for update;
  if not found then raise exception 'Game not found'; end if;
  if g.game_over then raise exception 'Game is over'; end if;
  update games set
    timer_started = true,
    turn_started_at = now(),
    chat_log = chat_log || jsonb_build_object('type','system','text','Timer started!'),
    updated_at = now()
  where game_code = p_code
  returning * into g;
  return g;
end $$;

-- ---------- grants ----------
revoke all on table games from anon;
grant select, insert on table games to anon;
grant execute on function next_team(text,int,text[]), remaining_teams(int,text[]), derive_cards_left(jsonb),
  reveal_card(text,text,int), reveal_cards_batch(text,text,int[]), give_hint(text,text,text,int), end_turn(text,text), timeout_turn(text),
  send_chat(text,text,text,text), restart_game(text,jsonb,text), start_timer(text), purge_old_games(int) to anon;
