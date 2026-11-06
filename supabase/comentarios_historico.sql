-- =====================================================================
-- Comentários e histórico por linha e por evento
-- Execute no Supabase: SQL Editor > New query
-- Pré-requisitos: permissoes_v2.sql, pastas.sql e lixeira_pastas_admin.sql
-- Pode ser executado mais de uma vez.
-- =====================================================================

-- 1) Comentários -------------------------------------------------------------
-- target_type: 'linha' (target_id = id da linha) ou 'evento' (target_id = "AAAA-MM-DD::texto")
-- mentions: e-mails mencionados no comentário (@{email})
create table if not exists public.item_comments (
  id           text primary key,
  project_id   text not null references public.projects(id) on delete cascade,
  target_type  text not null check (target_type in ('linha', 'evento')),
  target_id    text not null,
  target_date  text,
  author_email text not null,
  body         text not null check (char_length(body) between 1 and 2000),
  mentions     text[] not null default '{}',
  created_at   timestamptz not null default now()
);

create index if not exists idx_item_comments_target   on public.item_comments(project_id, target_type, target_id);
create index if not exists idx_item_comments_mentions on public.item_comments using gin (mentions);

-- 2) Histórico ---------------------------------------------------------------
create table if not exists public.item_history (
  id           bigint generated always as identity primary key,
  project_id   text not null references public.projects(id) on delete cascade,
  target_type  text not null check (target_type in ('linha', 'evento')),
  target_id    text not null,
  target_label text,
  actor_email  text not null,
  action       text not null,
  details      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists idx_item_history_target on public.item_history(project_id, target_type, target_id, created_at desc);

-- 3) Segurança ---------------------------------------------------------------
-- Quem vê o projeto vê os comentários e o histórico dele.
alter table public.item_comments enable row level security;
alter table public.item_history  enable row level security;
revoke all on public.item_comments, public.item_history from anon;

drop policy if exists item_comments_select on public.item_comments;
drop policy if exists item_comments_insert on public.item_comments;
drop policy if exists item_comments_delete on public.item_comments;

create policy item_comments_select on public.item_comments
  for select to authenticated using (public.can_view_project(project_id));

create policy item_comments_insert on public.item_comments
  for insert to authenticated
  with check (lower(author_email) = public.current_email() and public.can_view_project(project_id));

-- Só o autor (ou um administrador/dono do projeto) pode excluir um comentário
create policy item_comments_delete on public.item_comments
  for delete to authenticated
  using (lower(author_email) = public.current_email() or public.is_app_admin());

drop policy if exists item_history_select on public.item_history;
drop policy if exists item_history_insert on public.item_history;

create policy item_history_select on public.item_history
  for select to authenticated using (public.can_view_project(project_id));

create policy item_history_insert on public.item_history
  for insert to authenticated
  with check (lower(actor_email) = public.current_email() and public.can_view_project(project_id));
