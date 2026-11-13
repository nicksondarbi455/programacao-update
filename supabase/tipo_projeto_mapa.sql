-- =====================================================================
-- Tipo de projeto 'mapa': objetos próprios do projeto, rotas KMZ/KML,
-- anotações e eventos. Nada disto altera as tabelas do mapa oficial
-- (map_datacenters, map_routes, bucket mapa-rotas).
-- Execute no Supabase: SQL Editor > New query
-- Pré-requisitos: tipo_projeto_drawio.sql, mapa_fase1.sql (função has_map_access),
-- permissoes_v2.sql (can_view_project e can_edit_project).
-- Pode ser executado mais de uma vez.
-- =====================================================================

-- 1) Novo valor para o tipo do projeto ----------------------------------------
alter table public.projects drop constraint if exists projects_tipo_check;
alter table public.projects
    add constraint projects_tipo_check
    check (tipo in ('tabela', 'drawio', 'mapa'));

-- 2) Objetos (CPDs/COLOs/outros criados só dentro do projeto) -----------------
create table if not exists public.project_map_objects (
  id          text primary key,
  project_id  text not null references public.projects(id) on delete cascade,
  nome        text not null,
  tipo        text not null default 'CPD' check (tipo in ('CPD', 'COLO', 'OUTRO')),
  lat         double precision not null,
  lng         double precision not null,
  icone       text,
  descricao   text not null default '',
  criado_por  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 3) Rotas (KMZ/KML guardados no bucket projeto-mapa) -------------------------
create table if not exists public.project_map_routes (
  id           text primary key,
  project_id   text not null references public.projects(id) on delete cascade,
  nome         text not null,
  origem_id    text references public.project_map_objects(id) on delete set null,
  destino_id   text references public.project_map_objects(id) on delete set null,
  descricao    text not null default '',
  cabos        jsonb not null default '[]'::jsonb,
  arquivo_path text not null,
  nome_arquivo text not null,
  criado_por   text,
  created_at   timestamptz not null default now()
);

-- 4) Anotações diretas no mapa ---------------------------------------------------
create table if not exists public.project_map_notes (
  id         text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  lat        double precision not null,
  lng        double precision not null,
  texto      text not null,
  cor        text not null default '#f59e0b',
  criado_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5) Eventos marcados no calendário do projeto -----------------------------------
create table if not exists public.project_map_events (
  id         text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  titulo     text not null,
  descricao  text not null default '',
  data       date not null,
  concluido  boolean not null default false,
  criado_por text,
  created_at timestamptz not null default now()
);

-- 6) Segurança -----------------------------------------------------------------
-- Ver o projeto + ter acesso ao mapa para ler; editar o projeto + acesso ao mapa para alterar.
alter table public.project_map_objects enable row level security;
alter table public.project_map_routes  enable row level security;
alter table public.project_map_notes   enable row level security;
alter table public.project_map_events  enable row level security;
revoke all on public.project_map_objects, public.project_map_routes,
              public.project_map_notes, public.project_map_events from anon;

do $$
declare t text;
begin
  foreach t in array array['project_map_objects', 'project_map_routes', 'project_map_notes', 'project_map_events']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_write', t);

    execute format($f$
      create policy %I on public.%I for select to authenticated
      using (public.can_view_project(project_id) and public.has_map_access())
    $f$, t || '_select', t);

    execute format($f$
      create policy %I on public.%I for all to authenticated
      using (public.can_edit_project(project_id) and public.has_map_access())
      with check (public.can_edit_project(project_id) and public.has_map_access())
    $f$, t || '_write', t);
  end loop;
end $$;

-- 7) Arquivos KMZ/KML do projeto (bucket privado, até 10 MB) ---------------------
-- Caminho: <project_id>/<arquivo>. A pasta é o id do projeto, usada na política.
insert into storage.buckets (id, name, public, file_size_limit)
values ('projeto-mapa', 'projeto-mapa', false, 10485760)
on conflict (id) do nothing;

drop policy if exists projeto_mapa_select on storage.objects;
drop policy if exists projeto_mapa_insert on storage.objects;
drop policy if exists projeto_mapa_delete on storage.objects;

create policy projeto_mapa_select on storage.objects
  for select to authenticated
  using (bucket_id = 'projeto-mapa'
         and public.can_view_project((storage.foldername(name))[1])
         and public.has_map_access());

create policy projeto_mapa_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'projeto-mapa'
         and public.can_edit_project((storage.foldername(name))[1])
         and public.has_map_access());

create policy projeto_mapa_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'projeto-mapa'
         and public.can_edit_project((storage.foldername(name))[1])
         and public.has_map_access());
