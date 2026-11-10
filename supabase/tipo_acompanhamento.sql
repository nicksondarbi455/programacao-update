-- Tipo de acompanhamento do projeto:
--   'pontual'    -> comportamento atual: coluna Check, eventos concluídos ficam com check e linha verde
--   'recorrente' -> sem coluna Check e sem linha verde (revisões que sempre se repetem, ex.: visitas preventivas)
-- Execute no SQL Editor do Supabase. Projetos já existentes ficam como 'pontual'.

alter table public.projects
    add column if not exists project_type text not null default 'pontual';

alter table public.projects
    drop constraint if exists projects_project_type_check;

alter table public.projects
    add constraint projects_project_type_check
    check (project_type in ('pontual', 'recorrente'));
