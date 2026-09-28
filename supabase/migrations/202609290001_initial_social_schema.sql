create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text not null default 'لاعب جديد',
  avatar_url text,
  bio text not null default '',
  level integer not null default 1 check (level >= 1),
  xp integer not null default 0 check (xp >= 0),
  coins integer not null default 0 check (coins >= 0),
  status text not null default 'online' check (status in ('online','away','offline')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique(sender_id, receiver_id),
  check (sender_id <> receiver_id)
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text not null default '',
  game_type text not null default 'lobby',
  max_players integer not null default 8 check (max_players between 2 and 16),
  is_public boolean not null default true,
  status text not null default 'waiting' check (status in ('waiting','playing','finished','closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'player' check (role in ('owner','player')),
  joined_at timestamptz not null default now(),
  primary key(room_id,user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid references public.profiles(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  check ((receiver_id is not null) <> (room_id is not null))
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  game_type text not null,
  state jsonb not null default '{}'::jsonb,
  turn_user_id uuid references public.profiles(id) on delete set null,
  status text not null default 'waiting' check (status in ('waiting','playing','finished')),
  winner_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_players (
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  seat integer not null check (seat between 1 and 16),
  score integer not null default 0,
  state jsonb not null default '{}'::jsonb,
  primary key(session_id,user_id),
  unique(session_id,seat)
);

create table if not exists public.player_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reward_type text not null,
  amount integer not null default 1,
  source text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_friend_requests_receiver_status on public.friend_requests(receiver_id,status);
create index if not exists idx_room_members_user on public.room_members(user_id);
create index if not exists idx_messages_room_created on public.messages(room_id,created_at);
create index if not exists idx_messages_dm on public.messages(sender_id,receiver_id,created_at);
create index if not exists idx_notifications_user_created on public.notifications(user_id,created_at desc);
create index if not exists idx_game_sessions_room on public.game_sessions(room_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.profiles(id, display_name, username)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'display_name',''), 'لاعب جديد'),
    nullif(new.raw_user_meta_data->>'username','')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.friend_requests enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.game_sessions enable row level security;
alter table public.game_players enable row level security;
alter table public.player_rewards enable row level security;

create policy "profiles are readable"
on public.profiles for select to authenticated using (true);

create policy "users update own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "users create own profile"
on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);

create policy "friend requests visible to participants"
on public.friend_requests for select to authenticated
using ((select auth.uid()) in (sender_id,receiver_id));

create policy "users send friend requests"
on public.friend_requests for insert to authenticated
with check ((select auth.uid()) = sender_id and sender_id <> receiver_id);

create policy "receivers update requests"
on public.friend_requests for update to authenticated
using ((select auth.uid()) = receiver_id)
with check ((select auth.uid()) = receiver_id);

create policy "public rooms readable"
on public.rooms for select to authenticated using (is_public or owner_id = (select auth.uid()));

create policy "users create rooms"
on public.rooms for insert to authenticated
with check ((select auth.uid()) = owner_id);

create policy "owners update rooms"
on public.rooms for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "room members visible"
on public.room_members for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.room_members mine
    where mine.room_id = room_members.room_id and mine.user_id = (select auth.uid())
  )
);

create policy "users join rooms"
on public.room_members for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "users leave own membership"
on public.room_members for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "direct messages visible to participants"
on public.messages for select to authenticated
using ((select auth.uid()) = sender_id or (select auth.uid()) = receiver_id);

create policy "room messages visible to members"
on public.messages for select to authenticated
using (
  room_id is not null and exists (
    select 1 from public.room_members rm
    where rm.room_id = messages.room_id and rm.user_id = (select auth.uid())
  )
);

create policy "users send messages"
on public.messages for insert to authenticated
with check (
  (select auth.uid()) = sender_id
  and (
    (receiver_id is not null)
    or exists (
      select 1 from public.room_members rm
      where rm.room_id = messages.room_id and rm.user_id = (select auth.uid())
    )
  )
);

create policy "own notifications"
on public.notifications for select to authenticated
using ((select auth.uid()) = user_id);

create policy "own notifications update"
on public.notifications for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "room game sessions readable by members"
on public.game_sessions for select to authenticated
using (exists (
  select 1 from public.room_members rm
  where rm.room_id = game_sessions.room_id and rm.user_id = (select auth.uid())
));

create policy "room owners create game sessions"
on public.game_sessions for insert to authenticated
with check (exists (
  select 1 from public.rooms r
  where r.id = room_id and r.owner_id = (select auth.uid())
));

create policy "game players visible to members"
on public.game_players for select to authenticated
using (exists (
  select 1 from public.game_sessions gs
  join public.room_members rm on rm.room_id = gs.room_id
  where gs.id = game_players.session_id and rm.user_id = (select auth.uid())
));

create policy "users join game sessions"
on public.game_players for insert to authenticated
with check ((select auth.uid()) = user_id and exists (
  select 1 from public.game_sessions gs
  join public.room_members rm on rm.room_id = gs.room_id
  where gs.id = session_id and rm.user_id = (select auth.uid())
));

create policy "own rewards readable"
on public.player_rewards for select to authenticated
using ((select auth.uid()) = user_id);

alter publication supabase_realtime add table public.friend_requests;
alter publication supabase_realtime add table public.room_members;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.game_sessions;
alter publication supabase_realtime add table public.game_players;
