-- =====================================================================
-- Segurança do Painel NOC  —  execute no Supabase: SQL Editor > New query
-- Pressupostos: tabelas projects, column_configs, equipments, schedules já
-- existem; equipments.data é JSONB; ids são TEXT (ex.: 'proj_123').
-- =====================================================================

-- 1) Ativar Row Level Security (RLS) -----------------------------------
alter table public.projects        enable row level security;
alter table public.column_configs  enable row level security;
alter table public.equipments      enable row level security;
alter table public.schedules       enable row level security;

-- 2) Limpar políticas antigas (caso tenha criado alguma permissiva) ----
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('projects','column_configs','equipments','schedules')
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- 3) Cada utilizador só acede aos seus próprios projetos ---------------
create policy projects_owner_all on public.projects
  for all to authenticated
  using      (user_email = (auth.jwt() ->> 'email'))
  with check (user_email = (auth.jwt() ->> 'email'));

-- 4) Tabelas filhas: acesso apenas se o projeto pertencer ao utilizador -
create policy column_configs_owner_all on public.column_configs
  for all to authenticated
  using (exists (select 1 from public.projects p
                 where p.id = column_configs.project_id
                   and p.user_email = (auth.jwt() ->> 'email')))
  with check (exists (select 1 from public.projects p
                      where p.id = column_configs.project_id
                        and p.user_email = (auth.jwt() ->> 'email')));

create policy equipments_owner_all on public.equipments
  for all to authenticated
  using (exists (select 1 from public.projects p
                 where p.id = equipments.project_id
                   and p.user_email = (auth.jwt() ->> 'email')))
  with check (exists (select 1 from public.projects p
                      where p.id = equipments.project_id
                        and p.user_email = (auth.jwt() ->> 'email')));

create policy schedules_owner_all on public.schedules
  for all to authenticated
  using (exists (select 1 from public.projects p
                 where p.id = schedules.project_id
                   and p.user_email = (auth.jwt() ->> 'email')))
  with check (exists (select 1 from public.projects p
                      where p.id = schedules.project_id
                        and p.user_email = (auth.jwt() ->> 'email')));

-- 5) Visitantes sem login (role "anon") deixam de ter qualquer acesso ---
revoke all on public.projects, public.column_configs,
              public.equipments, public.schedules from anon;

-- 6) Índices que a RLS e as consultas usam ------------------------------
create index if not exists idx_projects_user_email   on public.projects(user_email);
create index if not exists idx_column_configs_project on public.column_configs(project_id);
create index if not exists idx_equipments_project     on public.equipments(project_id);
create index if not exists idx_schedules_project      on public.schedules(project_id);

-- 7) Funções atómicas (security invoker => a RLS continua a valer) -----

-- Atualiza UM campo do JSON da linha sem ler-e-reescrever no cliente
-- (evita perder edições simultâneas de campos diferentes).
create or replace function public.update_equipment_field(
  p_eq_id text, p_field text, p_value jsonb
) returns void
language sql
security invoker
set search_path = public
as $$
  update public.equipments
     set data = coalesce(data, '{}'::jsonb) || jsonb_build_object(p_field, p_value)
   where id = p_eq_id;
$$;

-- Substitui todas as colunas de um projeto numa única transação.
create or replace function public.replace_column_configs(
  p_project_id text, p_columns jsonb
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  delete from public.column_configs where project_id = p_project_id;

  insert into public.column_configs (id, project_id, name, type, position, width)
  select c.id, p_project_id, c.name, coalesce(c.type, 'text'),
         c.position, coalesce(c.width, 150)
  from jsonb_to_recordset(p_columns)
       as c(id text, name text, type text, position int, width int);
end;
$$;

grant execute on function public.update_equipment_field(text, text, jsonb) to authenticated;
grant execute on function public.replace_column_configs(text, jsonb)       to authenticated;

-- 8) MIGRAÇÃO dos dados antigos ----------------------------------------
-- Os projetos criados com o login antigo têm user_email = 'admin' e ficariam
-- invisíveis. Depois de criar a sua conta, atribua-os ao seu e-mail:
--
--   update public.projects set user_email = 'seu@email.com'
--   where user_email = 'admin';
