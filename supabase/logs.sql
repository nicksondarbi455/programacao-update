-- Tabela de logs (histórico de ações do sistema)
create table if not exists public.activity_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid default auth.uid(),
  user_email text,
  action text not null,
  entity_type text,
  entity_id text,
  project_id text,
  details jsonb not null default '{}'::jsonb
);

create index if not exists activity_logs_created_at_idx on public.activity_logs (created_at desc);
create index if not exists activity_logs_user_email_idx on public.activity_logs (user_email);
create index if not exists activity_logs_project_idx on public.activity_logs (project_id);

alter table public.activity_logs enable row level security;

drop policy if exists "logs_insert_authenticated" on public.activity_logs;
drop policy if exists "logs_select_authenticated" on public.activity_logs;

-- Qualquer usuário autenticado pode gravar logs
create policy "logs_insert_authenticated" on public.activity_logs
  for insert to authenticated with check (true);

-- Leitura liberada por enquanto. Restrinja quando criar o menu de logs.
create policy "logs_select_authenticated" on public.activity_logs
  for select to authenticated using (true);
