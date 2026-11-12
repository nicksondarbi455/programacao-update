-- Diagramas do projeto (draw.io). O XML do diagrama fica guardado aqui.
-- Quem vê o projeto pode abrir os diagramas; quem pode editar o projeto pode criar e salvar.
-- Execute no SQL Editor do Supabase.

create table if not exists public.project_diagrams (
  id          uuid primary key default gen_random_uuid(),
  project_id  text not null references public.projects(id) on delete cascade,
  name        text not null default 'Diagrama de rack',
  xml         text not null default '',
  updated_by  text,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

alter table public.project_diagrams enable row level security;

drop policy if exists "diagramas: ver" on public.project_diagrams;
create policy "diagramas: ver" on public.project_diagrams
  for select to authenticated
  using (public.can_view_project(project_id));

drop policy if exists "diagramas: criar" on public.project_diagrams;
create policy "diagramas: criar" on public.project_diagrams
  for insert to authenticated
  with check (public.can_edit_project(project_id));

drop policy if exists "diagramas: editar" on public.project_diagrams;
create policy "diagramas: editar" on public.project_diagrams
  for update to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

drop policy if exists "diagramas: apagar" on public.project_diagrams;
create policy "diagramas: apagar" on public.project_diagrams
  for delete to authenticated
  using (public.can_edit_project(project_id));
