-- =====================================================================
-- Calendário do mapa = mesma agenda das tabelas (tabela schedules).
-- 1) Copia os eventos já agendados em project_map_events para schedules
-- 2) Remove project_map_events (só depois de copiar)
-- 3) Liga o calendário dos projetos de mapa, para aparecerem em "Próximos"
-- Execute no SQL Editor do Supabase. Pode ser executado mais de uma vez.
-- Pré-requisito: tipo_projeto_mapa.sql. Supõe que schedules.items é jsonb
-- (o padrão quando a agenda é gravada pelo cliente Supabase).
-- =====================================================================

do $$
begin
  if to_regclass('public.project_map_events') is not null then
    insert into public.schedules (id, project_id, date_str, items)
    select 'sched_' || e.project_id || '_' || to_char(e.data, 'YYYY-MM-DD'),
           e.project_id,
           to_char(e.data, 'YYYY-MM-DD'),
           jsonb_agg(jsonb_build_object(
             'text', e.titulo,
             'completed', e.concluido,
             'statusText', case when e.concluido then '✔ Realizado com Sucesso' else 'Agendado' end
           ))
    from public.project_map_events e
    group by e.project_id, e.data
    on conflict (id) do update set items = public.schedules.items || excluded.items;

    drop table public.project_map_events;
  end if;
end $$;

update public.projects set has_calendar = true where tipo = 'mapa';
