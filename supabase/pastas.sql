-- =====================================================================
-- Pastas: agrupam projetos e definem quais departamentos veem o conteúdo
-- Execute no Supabase: SQL Editor > New query
-- Pré-requisito: permissoes_v2.sql já executado.
-- Pode ser executado mais de uma vez.
-- ATENÇÃO: se executar permissoes_v2.sql de novo, execute este arquivo em seguida.
-- =====================================================================

-- 1) Tabelas ---------------------------------------------------------------
create table if not exists public.folders (
  id          text primary key,
  user_email  text not null,
  name        text not null,
  description text not null default '',
  created_at  timestamptz not null default now()
);

create table if not exists public.folder_departments (
  folder_id     text not null references public.folders(id) on delete cascade,
  department_id text not null references public.departments(id) on delete cascade,
  primary key (folder_id, department_id)
);

create index if not exists idx_folder_departments_dep on public.folder_departments(department_id);

-- Projeto pertence a uma pasta (null = raiz). Ao excluir a pasta, o projeto volta para a raiz.
alter table public.projects
  add column if not exists folder_id text references public.folders(id) on delete set null;

create index if not exists idx_projects_folder on public.projects(folder_id);

alter table public.folders enable row level security;
alter table public.folder_departments enable row level security;
revoke all on public.folders from anon;
revoke all on public.folder_departments from anon;

-- 2) Funções de permissão --------------------------------------------------
-- Ver a pasta: admin | dono | estar num departamento da pasta
create or replace function public.can_view_folder(p_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.folders f
     where f.id = p_id
       and (
         public.is_app_admin()
         or lower(f.user_email) = public.current_email()
         or exists (
           select 1
             from public.folder_departments fd
             join public.department_members dm on dm.department_id = fd.department_id
            where fd.folder_id = f.id
              and dm.user_email = public.current_email()
         )
       )
  );
$$;

-- Gerir a pasta (editar, departamentos, excluir): admin | dono
create or replace function public.can_manage_folder(p_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.folders f
     where f.id = p_id
       and (public.is_app_admin() or lower(f.user_email) = public.current_email())
  );
$$;

-- Ver o projeto: regras anteriores OU (não privado e o utilizador pode ver a pasta dele)
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
        or (
          not p.is_private
          and p.folder_id is not null
          and public.can_view_folder(p.folder_id)
        )
      )
  );
$$;

-- 3) Proteção de campos do projeto (inclui mover entre pastas) -------------
-- Entrar em uma pasta: só o dono do projeto ou admin.
-- Sair de uma pasta: dono do projeto, admin, gestor da pasta,
-- ou a própria exclusão da pasta (o banco zera o folder_id).
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

  if new.folder_id is distinct from old.folder_id then
    if new.folder_id is not null then
      if not (public.is_app_admin() or lower(old.user_email) = public.current_email()) then
        raise exception 'Apenas o criador do projeto ou um administrador pode mover o projeto para uma pasta.';
      end if;
    elsif not (
      public.is_app_admin()
      or lower(old.user_email) = public.current_email()
      or public.can_manage_folder(old.folder_id)
      or not exists (select 1 from public.folders f where f.id = old.folder_id)
    ) then
      raise exception 'Você não pode retirar este projeto da pasta.';
    end if;
  end if;

  if new.is_private then
    delete from public.project_departments where project_id = new.id;
  end if;

  return new;
end;
$$;

-- 4) Políticas: pastas -----------------------------------------------------
drop policy if exists folders_select on public.folders;
drop policy if exists folders_insert on public.folders;
drop policy if exists folders_update on public.folders;
drop policy if exists folders_delete on public.folders;

create policy folders_select on public.folders
  for select to authenticated using (public.can_view_folder(id));

create policy folders_insert on public.folders
  for insert to authenticated with check (lower(user_email) = public.current_email());

create policy folders_update on public.folders
  for update to authenticated
  using (public.can_manage_folder(id)) with check (public.can_manage_folder(id));

create policy folders_delete on public.folders
  for delete to authenticated using (public.can_manage_folder(id));

drop policy if exists folder_departments_select on public.folder_departments;
drop policy if exists folder_departments_write  on public.folder_departments;

create policy folder_departments_select on public.folder_departments
  for select to authenticated using (public.can_view_folder(folder_id));

create policy folder_departments_write on public.folder_departments
  for all to authenticated
  using (public.can_manage_folder(folder_id))
  with check (public.can_manage_folder(folder_id));

-- 5) Políticas: projetos (criar dentro de uma pasta só se puder vê-la) -----
drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
  for insert to authenticated
  with check (
    lower(user_email) = public.current_email()
    and (folder_id is null or public.can_view_folder(folder_id))
  );
