-- Diagramas draw.io de cada CPD (aba Hack do card no mapa).
-- Um diagrama por CPD, identificado pelo nome do CPD (map_datacenters.nome).
-- Quem tem acesso ao mapa pode ver e editar os diagramas.
-- Execute no SQL Editor do Supabase.

create table if not exists public.cpd_diagrams (
  cpd_nome   text primary key references public.map_datacenters(nome) on delete cascade,
  xml        text not null default '',
  updated_by text,
  updated_at timestamptz not null default now()
);

alter table public.cpd_diagrams enable row level security;

drop policy if exists "cpd_diagramas: ler" on public.cpd_diagrams;
create policy "cpd_diagramas: ler" on public.cpd_diagrams
  for select to authenticated
  using (public.has_map_access());

drop policy if exists "cpd_diagramas: criar" on public.cpd_diagrams;
create policy "cpd_diagramas: criar" on public.cpd_diagrams
  for insert to authenticated
  with check (public.has_map_access());

drop policy if exists "cpd_diagramas: editar" on public.cpd_diagrams;
create policy "cpd_diagramas: editar" on public.cpd_diagrams
  for update to authenticated
  using (public.has_map_access())
  with check (public.has_map_access());

drop policy if exists "cpd_diagramas: apagar" on public.cpd_diagrams;
create policy "cpd_diagramas: apagar" on public.cpd_diagrams
  for delete to authenticated
  using (public.has_map_access());
