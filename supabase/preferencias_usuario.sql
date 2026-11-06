-- =====================================================================
-- Preferências por usuário: fixar itens e ordem personalizada
-- (cada pessoa vê a própria ordem; ninguém altera a ordem dos outros)
-- Execute no Supabase: SQL Editor > New query
-- Pode ser executado mais de uma vez.
-- =====================================================================

create table if not exists public.user_item_prefs (
  user_email text    not null,
  item_kind  text    not null check (item_kind in ('pasta', 'projeto')),
  item_id    text    not null,
  pinned     boolean not null default false,
  position   integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_email, item_kind, item_id)
);

create index if not exists idx_user_item_prefs_email on public.user_item_prefs(user_email);

alter table public.user_item_prefs enable row level security;
revoke all on public.user_item_prefs from anon;

drop policy if exists user_item_prefs_own on public.user_item_prefs;

-- Cada usuário lê, cria, altera e exclui somente as próprias preferências
create policy user_item_prefs_own on public.user_item_prefs
  for all to authenticated
  using (lower(user_email) = public.current_email())
  with check (lower(user_email) = public.current_email());
