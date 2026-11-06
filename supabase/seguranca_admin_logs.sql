-- =====================================================================
-- Segurança e auditoria (etapa 1)
--  - A senha da conta master não pode ser redefinida por outra conta
--  - Excluir usuário, tornar/remover admin e redefinir senha são gravados no log
--  - Tentativas de login falhas (contas existentes) são gravadas no log
-- Execute no Supabase: SQL Editor > New query
-- Pré-requisitos: logs.sql, permissoes_v2.sql, usuarios_departamentos.sql,
--                 pastas.sql e lixeira_pastas_admin.sql
-- Pode ser executado mais de uma vez.
-- ATENÇÃO: se executar permissoes_v2.sql ou lixeira_pastas_admin.sql de novo,
-- execute este arquivo em seguida.
-- =====================================================================

-- 1) Exclusão de usuário (registra no log) ------------------------------
create or replace function public.admin_delete_user(p_email text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_app_admin() then
    raise exception 'Apenas administradores podem excluir usuários.';
  end if;
  if lower(p_email) = public.current_email() then
    raise exception 'Não é possível excluir a própria conta.';
  end if;
  if exists (select 1 from public.profiles where lower(email) = lower(p_email) and is_master) then
    raise exception 'A conta master não pode ser excluída.';
  end if;

  delete from auth.users where lower(email) = lower(p_email);

  insert into public.activity_logs (user_email, action, entity_type, entity_id, details)
  values (public.current_email(), 'usuario_excluido', 'usuario', lower(p_email), '{}'::jsonb);
end;
$$;

-- 2) Tornar ou remover administrador (registra no log) ---------------------
create or replace function public.admin_set_app_admin(p_email text, p_is_admin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_app_admin() then
    raise exception 'Apenas administradores podem alterar administradores.';
  end if;
  if exists (select 1 from public.profiles where lower(email) = lower(p_email) and is_master) then
    raise exception 'O nível da conta master não pode ser alterado.';
  end if;

  update public.profiles set is_admin = p_is_admin where lower(email) = lower(p_email);

  insert into public.activity_logs (user_email, action, entity_type, entity_id, details)
  values (
    public.current_email(),
    case when p_is_admin then 'admin_concedido' else 'admin_removido' end,
    'usuario',
    lower(p_email),
    '{}'::jsonb
  );
end;
$$;

-- 3) Redefinir senha: conta master protegida e registro no log -------------
-- A senha nunca é gravada no log.
create or replace function public.admin_reset_password(p_email text, p_password text)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_id uuid;
begin
  if not public.is_app_admin() then
    raise exception 'Apenas administradores podem redefinir senhas.';
  end if;
  if exists (select 1 from public.profiles where lower(email) = lower(p_email) and is_master) then
    raise exception 'A senha da conta master não pode ser redefinida por outra conta.';
  end if;
  if p_password is null or length(p_password) < 6 then
    raise exception 'A senha deve ter pelo menos 6 caracteres.';
  end if;

  select id into v_id from auth.users where lower(email) = lower(p_email);
  if v_id is null then
    raise exception 'Usuário não encontrado.';
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
         updated_at = now()
   where id = v_id;

  begin
    delete from auth.sessions where user_id = v_id;
  exception when others then
    null;
  end;

  insert into public.activity_logs (user_email, action, entity_type, entity_id, details)
  values (public.current_email(), 'senha_redefinida', 'usuario', lower(p_email), '{}'::jsonb);
end;
$$;

-- 4) Tentativa de login falha ------------------------------------------------
-- Chamada pela tela de login (sem sessão). Só grava se a conta existir,
-- para o log não ser inundado com e-mails inventados.
create or replace function public.log_failed_login(p_email text, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_email is null or trim(p_email) = '' then
    return;
  end if;
  if not exists (select 1 from public.profiles where lower(email) = lower(trim(p_email))) then
    return;
  end if;

  insert into public.activity_logs (user_email, action, entity_type, entity_id, details)
  values (
    lower(trim(p_email)),
    'login_falhou',
    'conta',
    lower(trim(p_email)),
    jsonb_build_object('motivo', left(coalesce(p_motivo, 'desconhecido'), 200))
  );
end;
$$;

revoke all on function public.log_failed_login(text, text) from public;
grant  execute on function public.log_failed_login(text, text) to anon, authenticated;
