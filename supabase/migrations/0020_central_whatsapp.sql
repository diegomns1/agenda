-- =============================================================================
-- 0020_central_whatsapp.sql — Central do WhatsApp (11/11/2026)
--   O (14) 99802-3550 vira o WhatsApp oficial: leads, clientes e suporte. A IA responde tudo;
--   o Diego só entra quando ela pede ajuda. Cada pessoa que escreve vira um "contato" (card do kanban)
--   e todas as mensagens ficam guardadas. Só o servidor (service_role) lê e grava.
-- =============================================================================

create table if not exists public.whatsapp_contatos (
  telefone          text primary key,                 -- wa_id da Meta (só dígitos)
  nome_whatsapp     text,                             -- nome do perfil do WhatsApp da pessoa
  nome              text,                             -- nome que ela informou na conversa
  ramo              text,                             -- ex.: manicure, barbeiro (informado na conversa)
  profissional_id   uuid references public.profiles(id) on delete set null,  -- já tem cadastro?
  -- funil do lead (kanban)
  etapa             text not null default 'robo'
                    check (etapa in ('robo', 'link', 'cadastrou', 'assinou', 'sem_resposta')),
  -- quem está atendendo agora
  atendimento       text not null default 'robo'
                    check (atendimento in ('robo', 'precisa', 'humano')),
  motivo_ajuda      text,                             -- por que a IA chamou o Diego
  origem            jsonb,                            -- anúncio de onde veio (referral da Meta), se veio
  nao_lidas         int not null default 0,           -- mensagens que o Diego ainda não viu
  ia_usada          boolean not null default false,
  ia_dia            date,                             -- limite diário de IA para leads
  ia_mensagens_dia  int not null default 0,
  ia_custo_usd      numeric(10,4) not null default 0,
  criado_em         timestamptz not null default now(),
  ultima_msg_em     timestamptz not null default now(),
  ultima_do_contato_em timestamptz                    -- abre a janela de 24 h da Meta
);
create index if not exists whatsapp_contatos_ultima_idx on public.whatsapp_contatos (ultima_msg_em desc);
create index if not exists whatsapp_contatos_prof_idx on public.whatsapp_contatos (profissional_id);

create table if not exists public.whatsapp_mensagens (
  id         bigint generated always as identity primary key,
  telefone   text not null references public.whatsapp_contatos(telefone) on delete cascade,
  de         text not null check (de in ('contato', 'robo', 'equipe', 'sistema')),
  texto      text not null,
  wamid      text,
  criado_em  timestamptz not null default now()
);
create index if not exists whatsapp_mensagens_tel_idx on public.whatsapp_mensagens (telefone, criado_em desc);

alter table public.whatsapp_contatos  enable row level security;
alter table public.whatsapp_mensagens enable row level security;
-- sem políticas: só a service_role (servidor) acessa
