-- Server-validated board moves and final policy/index cleanup.
create table if not exists public.game_moves(id bigint generated always as identity primary key,session_id uuid not null references public.game_sessions(id) on delete cascade,user_id uuid not null references public.profiles(id) on delete cascade,move_no integer not null,roll integer,from_position integer,to_position integer,created_at timestamptz not null default now(),unique(session_id,move_no));
alter table public.game_moves enable row level security;
create policy "game moves members read" on public.game_moves for select to authenticated using(exists(select 1 from public.game_sessions gs join public.room_members rm on rm.room_id=gs.room_id where gs.id=session_id and rm.user_id=(select auth.uid())));
create policy "game moves own insert" on public.game_moves for insert to authenticated with check((select auth.uid())=user_id and exists(select 1 from public.game_sessions gs join public.room_members rm on rm.room_id=gs.room_id where gs.id=session_id and rm.user_id=(select auth.uid())));
-- The production function roll_board_game() validates membership, turn order, dice and win state before writing a move.
