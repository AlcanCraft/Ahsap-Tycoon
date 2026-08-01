-- AHŞAP TYCOON v1.4 - SUPABASE KURULUMU
-- Supabase Dashboard > SQL Editor bölümünde bir kez çalıştırın.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(username) between 3 and 24),
  email text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create unique index if not exists profiles_username_lower_unique
on public.profiles (lower(username));

create table if not exists public.game_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  save_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.game_saves enable row level security;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where user_id = auth.uid()),
    false
  );
$$;

grant execute on function public.current_user_is_admin() to authenticated;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (user_id = auth.uid() or public.current_user_is_admin());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles
for update
to authenticated
using (user_id = auth.uid() or public.current_user_is_admin())
with check (user_id = auth.uid() or public.current_user_is_admin());

drop policy if exists "game_saves_select_own_or_admin" on public.game_saves;
create policy "game_saves_select_own_or_admin"
on public.game_saves
for select
to authenticated
using (user_id = auth.uid() or public.current_user_is_admin());

drop policy if exists "game_saves_insert_own" on public.game_saves;
create policy "game_saves_insert_own"
on public.game_saves
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "game_saves_update_own" on public.game_saves;
create policy "game_saves_update_own"
on public.game_saves
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, username, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), 'Oyuncu_' || left(new.id::text, 6)),
    coalesce(new.email, '')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- YÖNETİCİ YETKİSİ:
-- Önce normal şekilde kendi hesabınızı oluşturun.
-- Ardından aşağıdaki e-posta adresini kendi adresinizle değiştirip çalıştırın:
--
-- update public.profiles
-- set is_admin = true
-- where email = 'SIZIN-EMAIL-ADRESINIZ';
