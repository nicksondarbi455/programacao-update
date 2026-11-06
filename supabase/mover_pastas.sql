-- =====================================================================
-- Mover pastas para dentro de outras pastas (ou de volta para a raiz)
-- Execute no Supabase: SQL Editor > New query
-- Pré-requisitos: pastas.sql e lixeira_pastas_admin.sql
-- Pode ser executado mais de uma vez.
-- =====================================================================

create or replace function public.move_folder(p_id text, p_parent text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_manage_folder(p_id) then
    raise exception 'Sem permissão para mover esta pasta.';
  end if;

  if exists (select 1 from public.folders f where f.id = p_id and f.deleted_at is not null) then
    raise exception 'Esta pasta está na lixeira.';
  end if;

  if p_parent is not null then
    -- Não é possível mover uma pasta para dentro dela mesma ou de uma subpasta sua
    if p_parent = p_id or exists (
      select 1 from public.folder_subtree(p_id) as s where s = p_parent
    ) then
      raise exception 'Não é possível mover uma pasta para dentro dela mesma.';
    end if;

    -- O destino precisa existir, estar fora da lixeira e ser gerenciável pelo usuário
    if not exists (select 1 from public.folders f where f.id = p_parent and f.deleted_at is null) then
      raise exception 'A pasta de destino não existe ou está na lixeira.';
    end if;
    if not public.can_manage_folder(p_parent) then
      raise exception 'Sem permissão para mover pastas para a pasta de destino.';
    end if;
  end if;

  update public.folders set parent_id = p_parent where id = p_id;
end;
$$;

revoke execute on function public.move_folder(text, text) from public, anon;
grant  execute on function public.move_folder(text, text) to authenticated;
