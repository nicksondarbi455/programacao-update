-- =====================================================================
-- Lixeira (30 dias), pastas dentro de pastas e administradores em Usuários
-- Execute no Supabase: SQL Editor > New query
-- Pré-requisitos: permissoes_v2.sql, usuarios_departamentos.sql e pastas.sql
-- Pode ser executado mais de uma vez.
-- ATENÇÃO: se executar permissoes_v2.sql de novo, execute este arquivo em seguida.
-- =====================================================================

-- 1) Colunas ---------------------------------------------------------------
-- parent_id: pasta dentro de pasta (ao excluir de vez a pasta-pai, as subpastas saem junto)
alter table public.folders add column if not exists parent_id  text references public.folders(id) on delete cascade;
-- deleted_at: data em que o item foi para a lixeira (null = ativo)
alter table public.folders add column if not exists deleted_at timestamptz;
alter table public.projects add column if not exists deleted_at timestamptz;

create index if not exists idx_folders_parent  on public.folders(parent_id);
create index if not exists idx_folders_deleted on public.folders(deleted_at);
create index if not exists idx_projects_deleted on public.projects(deleted_at);

-- 2) Subárvore de pastas (a pasta e todas as subpastas) --------------------
create or replace function public.folder_subtree(p_id text)
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  with recursive sub(id) as (
    select f.id from public.folders f where f.id = p_id
    union all
    select c.id from public.folders c join sub s on c.parent_id = s.id
  )
  select id from sub;
$$;

-- 3) Visibilidade ----------------------------------------------------------
-- Ver a pasta: não está na lixeira E (admin | dono | departamento da pasta | vê a pasta-pai)
create or replace function public.can_view_folder(p_id text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_owner   text;
  v_parent  text;
  v_deleted timestamptz;
begin
  select f.user_email, f.parent_id, f.deleted_at
    into v_owner, v_parent, v_deleted
    from public.folders f
   where f.id = p_id;

  if not found or v_deleted is not null then
    return false;
  end if;

  if public.is_app_admin() or lower(v_owner) = public.current_email() then
    return true;
  end if;

  if exists (
    select 1
      from public.folder_departments fd
      join public.department_members dm on dm.department_id = fd.department_id
     where fd.folder_id = p_id
       and dm.user_email = public.current_email()
  ) then
    return true;
  end if;

  -- Subpasta: quem vê a pasta-pai também vê a subpasta
  if v_parent is not null then
    return public.can_view_folder(v_parent);
  end if;

  return false;
end;
$$;

-- Ver o projeto: não está na lixeira E (regras anteriores OU pasta visível e não privado)
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
      and p.deleted_at is null
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

-- 4) Proteção de campos do projeto -----------------------------------------
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
      if exists (select 1 from public.folders f where f.id = new.folder_id and f.deleted_at is not null) then
        raise exception 'Não é possível mover o projeto para uma pasta que está na lixeira.';
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

-- 5) Políticas -------------------------------------------------------------
-- Criar pasta: dentro da raiz, ou dentro de uma pasta que o usuário vê
drop policy if exists folders_insert on public.folders;
create policy folders_insert on public.folders
  for insert to authenticated
  with check (
    lower(user_email) = public.current_email()
    and (parent_id is null or public.can_view_folder(parent_id))
  );

-- 6) Lixeira ---------------------------------------------------------------
-- Enviar para a lixeira: projeto (dono/admin) ou pasta (dono/admin).
-- A pasta leva junto as subpastas e os projetos dentro delas, com a MESMA data,
-- para que a restauração devolva tudo de uma vez.
create or replace function public.move_to_trash(p_kind text, p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ts timestamptz := now();
begin
  if p_kind = 'project' then
    if not public.can_manage_project(p_id) then
      raise exception 'Sem permissão para excluir este projeto.';
    end if;
    update public.projects set deleted_at = v_ts where id = p_id;

  elsif p_kind = 'folder' then
    if not public.can_manage_folder(p_id) then
      raise exception 'Sem permissão para excluir esta pasta.';
    end if;
    update public.folders set deleted_at = v_ts
     where id in (select public.folder_subtree(p_id));
    update public.projects set deleted_at = v_ts
     where folder_id in (select public.folder_subtree(p_id));

  else
    raise exception 'Tipo inválido.';
  end if;
end;
$$;

-- Restaurar: devolve o item (e, no caso de pasta, o que foi enviado junto)
create or replace function public.restore_item(p_kind text, p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ts     timestamptz;
  v_folder text;
  v_parent text;
begin
  if p_kind = 'project' then
    if not public.can_manage_project(p_id) then
      raise exception 'Sem permissão para restaurar este projeto.';
    end if;
    select p.deleted_at, p.folder_id into v_ts, v_folder
      from public.projects p where p.id = p_id;
    if v_ts is null then
      raise exception 'Este projeto não está na lixeira.';
    end if;
    if v_folder is not null and exists (
      select 1 from public.folders f where f.id = v_folder and f.deleted_at is not null
    ) then
      raise exception 'Restaure a pasta primeiro.';
    end if;
    update public.projects set deleted_at = null where id = p_id;

  elsif p_kind = 'folder' then
    if not public.can_manage_folder(p_id) then
      raise exception 'Sem permissão para restaurar esta pasta.';
    end if;
    select f.deleted_at, f.parent_id into v_ts, v_parent
      from public.folders f where f.id = p_id;
    if v_ts is null then
      raise exception 'Esta pasta não está na lixeira.';
    end if;
    if v_parent is not null and exists (
      select 1 from public.folders f where f.id = v_parent and f.deleted_at is not null
    ) then
      raise exception 'Restaure a pasta que contém esta pasta primeiro.';
    end if;
    update public.folders set deleted_at = null
     where id in (select public.folder_subtree(p_id)) and deleted_at = v_ts;
    update public.projects set deleted_at = null
     where folder_id in (select public.folder_subtree(p_id)) and deleted_at = v_ts;

  else
    raise exception 'Tipo inválido.';
  end if;
end;
$$;

-- Lista o que está na lixeira e que o usuário pode restaurar (dono ou admin)
create or replace function public.list_trash()
returns table (
  item_kind          text,
  item_id            text,
  item_name          text,
  item_owner         text,
  item_deleted_at    timestamptz,
  item_project_count int,
  item_folder_name   text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.purge_expired_trash();

  return query
  -- Pastas da lixeira (só as de topo: não mostra a subpasta se a pasta-pai também está na lixeira)
  select 'folder'::text,
         f.id,
         f.name,
         f.user_email,
         f.deleted_at,
         (select count(*)::int
            from public.projects p
           where p.folder_id in (select public.folder_subtree(f.id))
             and p.deleted_at = f.deleted_at),
         null::text
    from public.folders f
    left join public.folders pf on pf.id = f.parent_id
   where f.deleted_at is not null
     and (f.parent_id is null or pf.deleted_at is null)
     and public.can_manage_folder(f.id)
  union all
  -- Projetos da lixeira (não mostra os que foram junto com uma pasta da lixeira)
  select 'project'::text,
         p.id,
         p.name,
         p.user_email,
         p.deleted_at,
         null::int,
         fo.name
    from public.projects p
    left join public.folders fo on fo.id = p.folder_id
   where p.deleted_at is not null
     and (p.folder_id is null or fo.deleted_at is null)
     and public.can_manage_project(p.id)
  order by 5 desc;
end;
$$;

-- Limpeza automática: remove o que está na lixeira há mais de 30 dias
create or replace function public.purge_expired_trash()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cutoff timestamptz := now() - interval '30 days';
begin
  delete from public.projects where deleted_at is not null and deleted_at < v_cutoff;
  delete from public.folders  where deleted_at is not null and deleted_at < v_cutoff;
end;
$$;

-- Esvaziar a lixeira: somente o master
create or replace function public.empty_trash()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_master() then
    raise exception 'Apenas o administrador master pode esvaziar a lixeira.';
  end if;
  delete from public.projects where deleted_at is not null;
  delete from public.folders  where deleted_at is not null;
end;
$$;

revoke execute on function public.purge_expired_trash() from public, anon, authenticated;
revoke execute on function public.move_to_trash(text, text)  from public, anon;
revoke execute on function public.restore_item(text, text)   from public, anon;
revoke execute on function public.list_trash()                from public, anon;
revoke execute on function public.empty_trash()               from public, anon;
grant  execute on function public.move_to_trash(text, text)  to authenticated;
grant  execute on function public.restore_item(text, text)   to authenticated;
grant  execute on function public.list_trash()                to authenticated;
grant  execute on function public.empty_trash()               to authenticated;
revoke execute on function public.folder_subtree(text) from public, anon;
grant  execute on function public.folder_subtree(text) to authenticated;

-- Limpeza diária automática (se o pg_cron estiver disponível no seu projeto)
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('lixeira-purge-diaria', '0 3 * * *', $cron$select public.purge_expired_trash()$cron$);
exception when others then
  raise notice 'pg_cron indisponível (%). A limpeza acontece automaticamente ao abrir a lixeira.', sqlerrm;
end
$$;

-- 7) Administradores podem gerenciar usuários, exceto EXCLUIR a conta master
-- (funções recriadas: a permissão de administrador passa a valer no lugar de só master)

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
  if lower(p_email) = public.current_email() then
    raise exception 'Não é possível excluir a própria conta.';
  end if;
  if exists (select 1 from public.profiles where lower(email) = lower(p_email) and is_master) then
    raise exception 'A conta master não pode ser excluída.';
  end if;
  delete from auth.users where lower(email) = lower(p_email);
end;
$$;

create or replace function public.admin_set_app_admin(p_email text, p_is_admin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_app_admin() then
    raise exception 'Apenas administradores podem alterar administradores.';
  end if;
  if exists (select 1 from public.profiles where lower(email) = lower(p_email) and is_master) then
    raise exception 'O nível da conta master não pode ser alterado.';
  end if;
  update public.profiles set is_admin = p_is_admin where lower(email) = lower(p_email);
end;
$$;

create or replace function public.admin_reset_password(p_email text, p_password text)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_id uuid;
begin
  if not public.is_app_admin() then
    raise exception 'Apenas administradores podem redefinir senhas.';
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
    null;
  end;
end;
$$;
