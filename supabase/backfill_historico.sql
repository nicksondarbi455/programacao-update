-- =====================================================================
-- Importa para o histórico do projeto o que já tinha sido feito antes
-- de o histórico existir. Pode ser executado mais de uma vez: registros
-- já existentes não são duplicados.
-- Execute no Supabase: SQL Editor > New query
-- =====================================================================

-- 1) Ações antigas registradas em activity_logs (têm quem fez e quando)
with mapa(acao_log, acao_hist) as (
  values
    ('agendar',         'evento_agendado'),
    ('marcar_feito',    'evento_concluido'),
    ('desmarcar_feito', 'evento_reaberto'),
    ('desagendar',      'evento_removido')
)
insert into public.item_history
  (project_id, target_type, target_id, target_label, actor_email, action, details, created_at)
select
  l.project_id,
  'evento',
  l.entity_id || '::' || (l.details->>'evento'),
  l.details->>'evento',
  coalesce(l.user_email, 'não identificado'),
  m.acao_hist,
  jsonb_build_object('data', l.entity_id),
  l.created_at
from public.activity_logs l
join mapa m on m.acao_log = l.action
where l.project_id is not null
  and l.entity_id is not null
  and l.details->>'evento' is not null
  and not exists (
    select 1 from public.item_history h
    where h.project_id = l.project_id
      and h.target_id  = l.entity_id || '::' || (l.details->>'evento')
      and h.action     = m.acao_hist
      and abs(extract(epoch from (h.created_at - l.created_at))) < 60
  );

-- 2) Agendamentos que existem em schedules mas não têm nenhum registro de agendamento
insert into public.item_history
  (project_id, target_type, target_id, target_label, actor_email, action, details, created_at)
select
  s.project_id,
  'evento',
  s.date_str || '::' || (it.item->>'text'),
  it.item->>'text',
  'importado (sem registro)',
  'evento_agendado',
  jsonb_build_object('data', s.date_str)
    || case when it.item ? 'hora' then jsonb_build_object('horario', it.item->>'hora') else '{}'::jsonb end,
  (s.date_str || ' 08:00:00')::timestamp at time zone 'America/Fortaleza'
from public.schedules s
cross join lateral jsonb_array_elements(s.items) as it(item)
where jsonb_typeof(s.items) = 'array'
  and it.item->>'text' is not null
  and not exists (
    select 1 from public.item_history h
    where h.project_id = s.project_id
      and h.target_id  = s.date_str || '::' || (it.item->>'text')
      and h.action     = 'evento_agendado'
  );

-- 3) Conclusões que existem em schedules mas não têm registro de conclusão
insert into public.item_history
  (project_id, target_type, target_id, target_label, actor_email, action, details, created_at)
select
  s.project_id,
  'evento',
  s.date_str || '::' || (it.item->>'text'),
  it.item->>'text',
  'importado (sem registro)',
  'evento_concluido',
  jsonb_build_object('data', s.date_str),
  coalesce(
    (it.item->>'completedAt')::timestamptz,
    (s.date_str || ' 18:00:00')::timestamp at time zone 'America/Fortaleza'
  )
from public.schedules s
cross join lateral jsonb_array_elements(s.items) as it(item)
where jsonb_typeof(s.items) = 'array'
  and it.item->>'text' is not null
  and (it.item->>'completed')::boolean is true
  and not exists (
    select 1 from public.item_history h
    where h.project_id = s.project_id
      and h.target_id  = s.date_str || '::' || (it.item->>'text')
      and h.action     = 'evento_concluido'
  );

-- Conferência: quantos registros de cada tipo existem agora
select action, count(*) as total
from public.item_history
group by action
order by action;
