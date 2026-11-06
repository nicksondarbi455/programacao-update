-- =====================================================================
-- Acabamento: tempo real do dashboard e da página do projeto
-- Execute no Supabase: SQL Editor > New query
-- Adiciona as tabelas à publicação de tempo real (só as que ainda não estão).
-- Pode ser executado mais de uma vez.
-- O tempo real respeita as políticas de segurança (RLS): cada usuário recebe
-- só as alterações dos itens que pode ver.
-- =====================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'projects', 'folders', 'folder_departments', 'project_departments',
    'equipments', 'column_configs', 'schedules', 'item_comments'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end
$$;
