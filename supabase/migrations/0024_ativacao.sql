-- =============================================================================
-- 0024_ativacao.sql — mensagens de ativação para quem criou a conta e não usou (13/11/2026)
--   "ajuda_inicio": 1 dia depois do cadastro, para quem não cadastrou nada.
--   "feedback_teste": no último dia do teste grátis, pedindo o que faltou.
--   Por WhatsApp (modelo aprovado pela Meta) ou e-mail. Uma linha por envio: ninguém recebe duas vezes.
--   Só o servidor (service_role) lê e grava.
-- =============================================================================

create table if not exists public.ativacao_envios (
  id               bigint generated always as identity primary key,
  profissional_id  uuid not null references public.profiles(id) on delete cascade,
  tipo             text not null check (tipo in ('ajuda_inicio', 'feedback_teste')),
  canal            text not null check (canal in ('whatsapp', 'email')),
  ok               boolean not null default true,
  erro             text,
  manual           boolean not null default false,  -- mandado pelo botão do Admin
  enviado_em       timestamptz not null default now()
);
create index if not exists ativacao_envios_prof_idx on public.ativacao_envios (profissional_id, tipo);

alter table public.ativacao_envios enable row level security;
-- sem políticas: só a service_role (servidor) acessa
