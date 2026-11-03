-- =====================================================================
-- Logs de atividade (histórico de ações do sistema)
-- Execute no Supabase: SQL Editor > New query
-- Pré-requisito: permissoes_v2.sql já executado (funções is_app_admin / is_master).
-- Pode ser executado mais de uma vez.
-- =====================================================================

-- 1) Tabela -------------------------------------------------------------
create table if not exists public.activity_logs (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  user_id     uuid default auth.uid(),
  user_email  text,
  action      text not null,
  entity_type text,
  entity_id   text,
  project_id  text,
  details     jsonb not null default '{}'::jsonb
);

create index if not exists activity_logs_created_at_idx on public.activity_logs (created_at desc);
create index if not exists activity_logs_user_email_idx on public.activity_logs (user_email);
create index if not exists activity_logs_project_idx    on public.activity_logs (project_id);

-- 2) Row Level Security -------------------------------------------------
alter table public.activity_logs enable row level security;
revoke all on public.activity_logs from anon;

-- Remove políticas antigas (inclusive a de leitura aberta para qualquer logado)
drop policy if exists "logs_insert_authenticated" on public.activity_logs;
drop policy if exists "logs_select_authenticated" on public.activity_logs;
drop policy if exists "logs_select_admin"         on public.activity_logs;

-- Qualquer usuário autenticado pode GRAVAR logs (feito pelo logService.js)
create policy "logs_insert_authenticated" on public.activity_logs
  for insert to authenticated with check (true);

-- Somente administradores e o master podem LER logs
create policy "logs_select_admin" on public.activity_logs
  for select to authenticated using (public.is_app_admin());

-- 3) IP de origem preenchido automaticamente ----------------------------
-- Quando a gravação não traz "ip" em details, o banco lê o cabeçalho da
-- requisição e acrescenta o IP. Se o cabeçalho não existir, nada é gravado.
create or replace function public.fill_log_ip()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  headers json;
  ip text;
begin
  if new.details ? 'ip' then
    return new;
  end if;

  begin
    headers := current_setting('request.headers', true)::json;
    ip := coalesce(
      headers->>'cf-connecting-ip',
      headers->>'x-real-ip',
      split_part(headers->>'x-forwarded-for', ',', 1)
    );
  exception when others then
    ip := null;
  end;

  if ip is not null and trim(ip) <> '' then
    new.details := new.details || jsonb_build_object('ip', trim(ip));
  end if;

  return new;
end;
$$;

drop trigger if exists activity_logs_fill_ip on public.activity_logs;
create trigger activity_logs_fill_ip
  before insert on public.activity_logs
  for each row execute function public.fill_log_ip();
