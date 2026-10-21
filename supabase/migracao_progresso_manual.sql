-- Progresso manual ou automático (true = calculado pelos agendamentos)
alter table public.projects add column if not exists progress_auto boolean not null default true;
