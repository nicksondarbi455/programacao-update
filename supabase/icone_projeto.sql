-- Ícone escolhido para o projeto (classe do Font Awesome, ex.: 'fa-solid fa-database').
-- Execute no SQL Editor do Supabase. Projetos existentes ficam sem ícone (usam o padrão).
alter table public.projects
    add column if not exists icon text;
