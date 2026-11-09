-- =====================================================================
-- Mapa de rede (fase 1): datacenters e rotas no banco, acesso por usuário
-- Execute no Supabase: SQL Editor > New query
-- Pré-requisitos: permissoes_v2.sql, usuarios_departamentos.sql, seguranca_admin_logs.sql
-- Pode ser executado mais de uma vez.
-- =====================================================================

-- 1) Acesso ao mapa por usuário --------------------------------------------
alter table public.profiles add column if not exists tem_acesso_mapa boolean not null default false;

-- A conta master sempre tem acesso
update public.profiles set tem_acesso_mapa = true where is_master = true;

create or replace function public.has_map_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
     where lower(p.email) = public.current_email()
       and (p.is_master or p.tem_acesso_mapa)
  );
$$;

revoke execute on function public.has_map_access() from public, anon;
grant  execute on function public.has_map_access() to authenticated;

-- Administradores liberam ou removem o acesso (registrado no log)
create or replace function public.admin_set_map_access(p_email text, p_value boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_app_admin() then
    raise exception 'Apenas administradores podem alterar o acesso ao mapa.';
  end if;
  if exists (select 1 from public.profiles where lower(email) = lower(p_email) and is_master) then
    raise exception 'A conta master sempre tem acesso ao mapa.';
  end if;

  update public.profiles set tem_acesso_mapa = p_value where lower(email) = lower(p_email);

  insert into public.activity_logs (user_email, action, entity_type, entity_id, details)
  values (public.current_email(), 'acesso_mapa_alterado', 'usuario', lower(p_email),
          jsonb_build_object('acesso', p_value));
end;
$$;

revoke execute on function public.admin_set_map_access(text, boolean) from public, anon;
grant  execute on function public.admin_set_map_access(text, boolean) to authenticated;

-- 2) Datacenters (CPDs e COLOs) -------------------------------------------
create table if not exists public.map_datacenters (
  nome       text primary key,
  lat        double precision not null,
  lng        double precision not null,
  tipo       text not null check (tipo in ('CPD', 'COLO')),
  created_at timestamptz not null default now()
);

-- 3) Rotas (KMZ/KML guardados no Storage) ----------------------------------
create table if not exists public.map_routes (
  id           text primary key,
  origem       text not null references public.map_datacenters(nome) on update cascade,
  destino      text not null references public.map_datacenters(nome) on update cascade,
  descricao    text not null default '',
  cabos        jsonb not null default '[]'::jsonb,
  arquivo_path text not null,
  nome_arquivo text not null,
  criado_por   text not null,
  updated_at   timestamptz not null default now(),
  check (origem <> destino)
);

alter table public.map_datacenters enable row level security;
alter table public.map_routes      enable row level security;
revoke all on public.map_datacenters, public.map_routes from anon;

drop policy if exists map_datacenters_select on public.map_datacenters;
drop policy if exists map_datacenters_write  on public.map_datacenters;
drop policy if exists map_routes_select      on public.map_routes;
drop policy if exists map_routes_insert      on public.map_routes;
drop policy if exists map_routes_update      on public.map_routes;
drop policy if exists map_routes_delete      on public.map_routes;

-- Quem tem acesso ao mapa vê os datacenters; só administradores alteram a lista
create policy map_datacenters_select on public.map_datacenters
  for select to authenticated using (public.has_map_access());

create policy map_datacenters_write on public.map_datacenters
  for all to authenticated
  using (public.is_app_admin()) with check (public.is_app_admin());

-- Quem tem acesso ao mapa cadastra e vê rotas; exclui a própria rota ou um administrador
create policy map_routes_select on public.map_routes
  for select to authenticated using (public.has_map_access());

create policy map_routes_insert on public.map_routes
  for insert to authenticated
  with check (public.has_map_access() and lower(criado_por) = public.current_email());

create policy map_routes_update on public.map_routes
  for update to authenticated
  using (public.has_map_access()) with check (public.has_map_access());

create policy map_routes_delete on public.map_routes
  for delete to authenticated
  using (public.is_app_admin() or lower(criado_por) = public.current_email());

-- 4) Storage para os arquivos KMZ/KML (privado, até 10 MB) -------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('mapa-rotas', 'mapa-rotas', false, 10485760)
on conflict (id) do nothing;

drop policy if exists mapa_rotas_select on storage.objects;
drop policy if exists mapa_rotas_insert on storage.objects;
drop policy if exists mapa_rotas_delete on storage.objects;

create policy mapa_rotas_select on storage.objects
  for select to authenticated
  using (bucket_id = 'mapa-rotas' and public.has_map_access());

create policy mapa_rotas_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'mapa-rotas' and public.has_map_access());

create policy mapa_rotas_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'mapa-rotas' and public.has_map_access());

-- 5) Datacenters iniciais (os mesmos 33 pontos do esboço) ---------------------
insert into public.map_datacenters (nome, lat, lng, tipo) values
  ('CPD EUSÉBIO', -3.891444, -38.448389, 'CPD'),
  ('CPD AQUIRAZ', -3.905667, -38.391444, 'CPD'),
  ('CPD JABUTI', -3.926083, -38.507528, 'CPD'),
  ('CPD PAJUÇARA', -3.861583, -38.585, 'CPD'),
  ('CPD PACATUBA', -3.887917, -38.613583, 'CPD'),
  ('CPD ACARAPE', -4.224111, -38.707861, 'CPD'),
  ('CPD GUAIÚBA', -4.045361, -38.63248, 'CPD'),
  ('CPD ARACOIABA', -4.36975, -38.808472, 'CPD'),
  ('CPD MARANGUAPE', -3.891028, -38.683611, 'CPD'),
  ('CPD BARREIRA', -4.292278, -38.643333, 'CPD'),
  ('CPD CHOROZINHO', -4.297444, -38.499194, 'CPD'),
  ('CPD CASCAVEL', -4.132611, -38.240389, 'CPD'),
  ('CPD PINDORETAMA', -4.030972, -38.30525, 'CPD'),
  ('CPD CAPONGA', -4.048861, -38.207583, 'CPD'),
  ('CPD TAPERA', -3.941694, -38.324333, 'CPD'),
  ('CPD PALMEIRAS', -3.848, -38.514222, 'CPD'),
  ('CPD BARRA DO CEARÁ', -3.705167, -38.57625, 'CPD'),
  ('CPD GENIBAÚ', -3.7585, -38.604861, 'CPD'),
  ('CPD BEBERIBE', -4.182944, -38.130056, 'CPD'),
  ('CPD ITAITINGA', -3.974556, -38.517333, 'CPD'),
  ('CPD WSTC', -3.788056, -38.479972, 'CPD'),
  ('CPD CAUCAIA', -3.727647, -38.661576, 'CPD'),
  ('CPD CAPISTRANO', -4.466461, -38.897098, 'CPD'),
  ('CPD PACAJUS', -4.15066, -38.47323, 'CPD'),
  ('CPD TERRAZO', -3.86251, -38.47097, 'CPD'),
  ('CPD CHORO', -4.8477, -39.13665, 'CPD'),
  ('CPD PORTO DAS DUNAS', -3.85126, -38.39646, 'CPD'),
  ('CPD HORIZONTE', -4.09676, -38.49416, 'CPD'),
  ('COLO ASCENTY', -3.83049, -38.61117, 'COLO'),
  ('COLO EMBRATEL', -3.75228, -38.50762, 'COLO'),
  ('COLO ANGOLA CABLES', -3.7386, -38.45715, 'COLO'),
  ('COLO GLOBENET', -3.73483, -38.45801, 'COLO'),
  ('COLO OI VITAL', -3.73668, -38.50277, 'COLO')
on conflict (nome) do nothing;
