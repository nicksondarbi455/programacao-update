-- =====================================================================
-- Tipo de projeto: 'tabela' (Rack, como hoje) e 'drawio' (diagrama livre)
-- Execute no Supabase: SQL Editor > New query
-- Pré-requisitos: permissoes_v2.sql (funções can_view_project e can_edit_project)
-- Pode ser executado mais de uma vez.
-- Projetos já existentes ficam como 'tabela'.
-- =====================================================================

-- 1) Tipo do projeto ---------------------------------------------------------
-- Atenção: é diferente de project_type ('pontual' | 'recorrente'), que é o acompanhamento.
alter table public.projects
    add column if not exists tipo text not null default 'tabela';

alter table public.projects
    drop constraint if exists projects_tipo_check;

alter table public.projects
    add constraint projects_tipo_check
    check (tipo in ('tabela', 'drawio'));

-- 2) Diagrama de cada projeto do tipo drawio -------------------------------
create table if not exists public.project_diagrams (
  project_id text primary key references public.projects(id) on delete cascade,
  xml        text not null default '',
  updated_by text,
  updated_at timestamptz not null default now()
);

alter table public.project_diagrams enable row level security;
revoke all on public.project_diagrams from anon;

drop policy if exists project_diagrams_select on public.project_diagrams;
drop policy if exists project_diagrams_insert on public.project_diagrams;
drop policy if exists project_diagrams_update on public.project_diagrams;

-- Quem pode ver o projeto lê o diagrama; quem pode editar o projeto salva.
-- Sem política de exclusão: o diagrama some junto com o projeto (on delete cascade).
create policy project_diagrams_select on public.project_diagrams
  for select to authenticated
  using (public.can_view_project(project_id));

create policy project_diagrams_insert on public.project_diagrams
  for insert to authenticated
  with check (public.can_edit_project(project_id));

create policy project_diagrams_update on public.project_diagrams
  for update to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));
