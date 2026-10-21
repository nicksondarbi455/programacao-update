-- Progresso e opção de mostrar progresso no card do projeto
alter table public.projects add column if not exists show_progress boolean not null default false;
alter table public.projects add column if not exists progress integer not null default 0;
