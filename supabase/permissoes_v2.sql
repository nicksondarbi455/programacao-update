-- =====================================================================
-- Permissões v2: master, administradores, departamentos e projetos privados
-- Execute no Supabase: SQL Editor > New query
-- Pré-requisitos: seguranca.sql e usuarios_departamentos.sql já executados.
-- Pode ser executado mais de uma vez.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- 1) Campo "master" e conta master -------------------------------------
alter table public.profiles add column if not exists is_master boolean not null default false;

update public.profiles
   set is_admin = true, is_master = true
 where lower(email) = 'nicksondarbi@gmail.com';

-- 2) Projetos x departamentos -------------------------------------------
create table if not exists public.project_departments (
  project_id    text not null references public.projects(id) on delete cascade,
  department_id text not null references public.departments(id) on delete cascade,
  primary key (project_id, department_id)
);

create index if not exists idx_project_departments_dep on public.project_departments(department_id);

alter table public.project_departments enable row level security;
revoke all on public.project_departments from anon;

-- 3) Funções de permissão -----------------------------------------------
create or replace function public.current_email()
returns text
language sql
stable
as $$
  select lower(auth.jwt() ->> 'email');
$$;

create or replace function public.is_master()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_master from public.profiles p where p.email = public.current_email()), false);
$$;

-- Administradores (e o master) veem e editam todos os projetos
create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_admin or p.is_master from public.profiles p where p.email = public.current_email()), false);
$$;

-- Ver: admin | dono | projeto não privado e o utilizador está num departamento do projeto
create or replace function public.can_view_project(p_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_id
      and (
        public.is_app_admin()
        or lower(p.user_email) = public.current_email()
        or (
          not p.is_private
          and exists (
            select 1
              from public.project_departments pd
              join public.department_members dm on dm.department_id = pd.department_id
             where pd.project_id = p.id
               and dm.user_email = public.current_email()
          )
        )
      )
  );
$$;

-- Editar: admin | dono | projeto não privado e o utilizador tem "editar" num departamento do projeto
create or replace function public.can_edit_project(p_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_id
      and (
        public.is_app_admin()
        or lower(p.user_email) = public.current_email()
        or (
          not p.is_private
          and exists (
            select 1
              from public.project_departments pd
              join public.department_members dm on dm.department_id = pd.department_id
             where pd.project_id = p.id
               and dm.user_email = public.current_email()
               and dm.access_level = 'editar'
          )
        )
      )
  );
$$;

-- Gerir (configurações, privacidade, departamentos, excluir): admin | dono
create or replace function public.can_manage_project(p_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_id
      and (public.is_app_admin() or lower(p.user_email) = public.current_email())
  );
$$;

-- 4) Proteção de campos do projeto ---------------------------------------
-- Quem não é dono nem admin (ex.: editor de departamento) não pode mudar
-- o dono nem a privacidade. Ao marcar como privado, os departamentos são removidos.
create or replace function public.protect_project_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_app_admin() or lower(old.user_email) = public.current_email()) then
    if new.user_email is distinct from old.user_email
       or new.is_private is distinct from old.is_private then
      raise exception 'Apenas o criador do projeto ou um administrador pode alterar o dono ou a privacidade.';
    end if;
  end if;

  if new.is_private then
    delete from public.project_departments where project_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_project on public.projects;
create trigger trg_protect_project
  before update on public.projects
  for each row execute function public.protect_project_fields();

-- 5) Políticas: projetos ---------------------------------------------------
drop policy if exists projects_owner_all on public.projects;
drop policy if exists projects_select on public.projects;
drop policy if exists projects_insert on public.projects;
drop policy if exists projects_update on public.projects;
drop policy if exists projects_delete on public.projects;

create policy projects_select on public.projects
  for select to authenticated using (public.can_view_project(id));

create policy projects_insert on public.projects
  for insert to authenticated with check (lower(user_email) = public.current_email());

create policy projects_update on public.projects
  for update to authenticated
  using (public.can_edit_project(id))
  with check (public.can_edit_project(id));

create policy projects_delete on public.projects
  for delete to authenticated using (public.can_manage_project(id));

-- 6) Políticas: tabelas filhas -----------------------------------------------
drop policy if exists column_configs_owner_all on public.column_configs;
drop policy if exists column_configs_select on public.column_configs;
drop policy if exists column_configs_write on public.column_configs;
create policy column_configs_select on public.column_configs
  for select to authenticated using (public.can_view_project(project_id));
create policy column_configs_write on public.column_configs
  for all to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

drop policy if exists equipments_owner_all on public.equipments;
drop policy if exists equipments_select on public.equipments;
drop policy if exists equipments_write on public.equipments;
create policy equipments_select on public.equipments
  for select to authenticated using (public.can_view_project(project_id));
create policy equipments_write on public.equipments
  for all to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

drop policy if exists schedules_owner_all on public.schedules;
drop policy if exists schedules_select on public.schedules;
drop policy if exists schedules_write on public.schedules;
create policy schedules_select on public.schedules
  for select to authenticated using (public.can_view_project(project_id));
create policy schedules_write on public.schedules
  for all to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

drop policy if exists project_departments_select on public.project_departments;
drop policy if exists project_departments_write on public.project_departments;
create policy project_departments_select on public.project_departments
  for select to authenticated using (public.can_view_project(project_id));
create policy project_departments_write on public.project_departments
  for all to authenticated
  using (public.can_manage_project(project_id))
  with check (public.can_manage_project(project_id));

-- 7) Departamentos: só o master cria, edita, exclui e atribui -------------
drop policy if exists departments_admin_write on public.departments;
create policy departments_admin_write on public.departments
  for all to authenticated
  using (public.is_master()) with check (public.is_master());

drop policy if exists department_members_admin_write on public.department_members;
create policy department_members_admin_write on public.department_members
  for all to authenticated
  using (public.is_master()) with check (public.is_master());

-- 8) Ações de usuários: só o master ----------------------------------------

-- Excluir conta (não pode excluir a própria conta nem a do master)
create or replace function public.admin_delete_user(p_email text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_master() then
    raise exception 'Apenas o administrador master pode excluir usuários.';
  end if;
  if lower(p_email) = public.current_email() then
    raise exception 'Não é possível excluir a própria conta.';
  end if;
  if exists (select 1 from public.profiles where lower(email) = lower(p_email) and is_master) then
    raise exception 'A conta master não pode ser excluída.';
  end if;
  delete from auth.users where lower(email) = lower(p_email);
end;
$$;

-- Tornar ou remover administrador
create or replace function public.admin_set_app_admin(p_email text, p_is_admin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_master() then
    raise exception 'Apenas o administrador master pode alterar administradores.';
  end if;
  if exists (select 1 from public.profiles where lower(email) = lower(p_email) and is_master) then
    raise exception 'O nível da conta master não pode ser alterado.';
  end if;
  update public.profiles set is_admin = p_is_admin where lower(email) = lower(p_email);
end;
$$;

-- Redefinir a senha de um utilizador e derrubar as sessões ativas dele
create or replace function public.admin_reset_password(p_email text, p_password text)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_id uuid;
begin
  if not public.is_master() then
    raise exception 'Apenas o administrador master pode redefinir senhas.';
  end if;
  if p_password is null or length(p_password) < 6 then
    raise exception 'A senha deve ter pelo menos 6 caracteres.';
  end if;

  select id into v_id from auth.users where lower(email) = lower(p_email);
  if v_id is null then
    raise exception 'Usuário não encontrado.';
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
         updated_at = now()
   where id = v_id;

  begin
    delete from auth.sessions where user_id = v_id;
  exception when others then
    null; -- se a tabela de sessões mudar no futuro, a senha continua redefinida
  end;
end;
$$;

revoke execute on function public.admin_delete_user(text) from public, anon;
revoke execute on function public.admin_set_app_admin(text, boolean) from public, anon;
revoke execute on function public.admin_reset_password(text, text) from public, anon;
grant  execute on function public.admin_delete_user(text) to authenticated;
grant  execute on function public.admin_set_app_admin(text, boolean) to authenticated;
grant  execute on function public.admin_reset_password(text, text) to authenticated;
