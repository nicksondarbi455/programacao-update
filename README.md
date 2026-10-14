# Painel NOC

Gestão de programação de rede: projetos com tabelas de equipamentos configuráveis (colunas, cores, agrupamento em eventos), importação de Excel e calendário de serviços, com sincronização em tempo real.

**Stack:** React 19 · Vite · Supabase (Auth, Postgres, Realtime) · SheetJS (`xlsx`)

## Como executar

```bash
npm install
cp .env.example .env.local   # preencha com a URL e a chave anon do seu projeto Supabase
npm run dev
```

Outros comandos: `npm run build`, `npm run preview`, `npm run lint`.

## Configuração do Supabase (obrigatória)

1. Em **Authentication → Providers**, ative *Email*. (Opcional: desative "Allow new users to sign up" depois de criar as contas necessárias.)
2. Em **SQL Editor**, execute o ficheiro [`supabase/seguranca.sql`](supabase/seguranca.sql). Ele:
   - ativa **Row Level Security** em todas as tabelas, para que cada utilizador veja apenas os seus projetos;
   - bloqueia o acesso de visitantes sem login;
   - cria as funções `update_equipment_field` e `replace_column_configs` (gravações atómicas).
3. Se já tem projetos criados com o login antigo (`user_email = 'admin'`), atribua-os à sua conta — o comando está no fim do ficheiro SQL.

> A chave `anon` é pública por desenho; quem protege os dados é a RLS. **Nunca** coloque a chave `service_role` no frontend.

## Estrutura

```
src/
├── pages/           AuthPage, DashboardPage (projetos), NocPage (tabela + calendário)
├── components/
│   ├── atoms/       Button, Input, Checkbox, StatusDot
│   ├── molecules/   ConnectionStatus, ProgressBar
│   ├── organisms/   TopBar, NocTable, Modals, FloatingCalendar, CalendarWidget
│   └── templates/   NocTemplate
└── services/        supabase.js (cliente), supabaseService.js (acesso a dados)
supabase/seguranca.sql   RLS + funções SQL
```
