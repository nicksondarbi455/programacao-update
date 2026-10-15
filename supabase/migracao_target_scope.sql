-- =====================================================================
-- Migração: guardar o "onde aplicar" de cada coluna (todas as linhas / só eventos)
-- Execute no Supabase: SQL Editor > New query  (uma única vez)
-- =====================================================================

-- 1) Nova coluna na tabela (projetos antigos ficam com 'all')
alter table public.column_configs
  add column if not exists target_scope text not null default 'all';

-- 2) Função que substitui as colunas agora também gravando target_scope
create or replace function public.replace_column_configs(
  p_project_id text, p_columns jsonb
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  delete from public.column_configs where project_id = p_project_id;

  insert into public.column_configs (id, project_id, name, type, position, width, target_scope)
  select c.id, p_project_id, c.name, coalesce(c.type, 'text'),
         c.position, coalesce(c.width, 150), coalesce(c.target_scope, 'all')
  from jsonb_to_recordset(p_columns)
       as c(id text, name text, type text, position int, width int, target_scope text);
end;
$$;

grant execute on function public.replace_column_configs(text, jsonb) to authenticated;
