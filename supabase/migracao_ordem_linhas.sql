-- =====================================================================
-- Migração: guardar a ORDEM das linhas (evita que linhas "subam" ao serem atualizadas)
-- Execute no Supabase: SQL Editor > New query  (uma única vez)
-- =====================================================================

-- 1) Coluna de posição
alter table public.equipments
  add column if not exists position double precision;

-- 2) Preenche a ordem atual das linhas já existentes
update public.equipments e
   set position = s.rn
  from (select id, row_number() over (partition by project_id order by ctid) as rn
          from public.equipments) s
 where e.id = s.id
   and e.position is null;

-- 3) Índice para ordenar por projeto
create index if not exists idx_equipments_project_position
  on public.equipments(project_id, position);
