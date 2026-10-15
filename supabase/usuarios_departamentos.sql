-- =====================================================================
-- Usuários e departamentos — execute no Supabase: SQL Editor > New query
-- Pré-requisito: seguranca.sql já executado.
-- Pode ser executado mais de uma vez (usa "if not exists" / "drop if exists").
-- =====================================================================

-- 1) PERFIS: espelho de auth.users, preenchido automaticamente no registo ---
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  full_name   text not null default '',
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, lower(new.email), coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Contas que já existiam antes deste script
insert into public.profiles (id, email, full_name)
select id, lower(email), coalesce(raw_user_meta_data->>'full_name', '')
from auth.users
where email is not null
on conflict (id) do nothing;

alter table public.profiles enable row level security;

drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated on public.profiles
  for select to authenticated using (true);
-- Sem políticas de insert/update/delete: só o trigger e o administrador (SQL) alteram perfis.

-- 2) Função auxiliar: o utilizador atual é administrador? -------------------
create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.email = lower(auth.jwt() ->> 'email')),
    false
  );
$$;

-- 3) DEPARTAMENTOS e membros com o nível de acesso ---------------------------
create table if not exists public.departments (
  id          text primary key,
  name        text not null unique,
  created_at  timestamptz not null default now()
);

create table if not exists public.department_members (
  department_id text not null references public.departments(id) on delete cascade,
  user_email    text not null references public.profiles(email) on update cascade on delete cascade,
  access_level  text not null default 'visualizar'
                check (access_level in ('visualizar', 'editar')),
  created_at    timestamptz not null default now(),
  primary key (department_id, user_email)
);

create index if not exists idx_department_members_email on public.department_members(user_email);

alter table public.departments        enable row level security;
alter table public.department_members enable row level security;

drop policy if exists departments_select on public.departments;
drop policy if exists departments_admin_write on public.departments;
create policy departments_select on public.departments
  for select to authenticated using (true);
create policy departments_admin_write on public.departments
  for all to authenticated
  using (public.is_app_admin()) with check (public.is_app_admin());

drop policy if exists department_members_select on public.department_members;
drop policy if exists department_members_admin_write on public.department_members;
create policy department_members_select on public.department_members
  for select to authenticated using (true);
create policy department_members_admin_write on public.department_members
  for all to authenticated
  using (public.is_app_admin()) with check (public.is_app_admin());

revoke all on public.profiles, public.departments, public.department_members from anon;

-- 4) Excluir utilizador (apenas administradores) -----------------------------
-- Remove a conta de login; o perfil e os vínculos a departamentos saem em cascata.
create or replace function public.admin_delete_user(p_email text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_app_admin() then
    raise exception 'Apenas administradores podem excluir usuários.';
  end if;
  if lower(p_email) = lower(auth.jwt() ->> 'email') then
    raise exception 'Não é possível excluir a própria conta.';
  end if;
  delete from auth.users where lower(email) = lower(p_email);
end;
$$;

revoke execute on function public.admin_delete_user(text) from public, anon;
grant  execute on function public.admin_delete_user(text) to authenticated;

-- 5) PRIMEIRO ADMINISTRADOR -------------------------------------------------
-- Depois de criar a sua conta no app, execute (troque pelo seu e-mail):
--
--   update public.profiles set is_admin = true where email = 'seu@email.com';
