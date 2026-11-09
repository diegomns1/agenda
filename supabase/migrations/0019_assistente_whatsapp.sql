-- =============================================================================
-- 0019_assistente_whatsapp.sql — Assistente da Vaguinha no WhatsApp (Fase 1, 09/11/2026)
--   A profissional conecta o próprio WhatsApp e conversa com a assistente pelo número da Vaguinha
--   (API oficial da Meta). Tudo aqui é gravado SÓ pelo servidor (service_role), na rota do webhook
--   e nas ações do painel; a profissional só pode LER o próprio vínculo (para a tela de Perfil).
-- =============================================================================

-- Número de WhatsApp de cada profissional conectada (um número só pode estar em uma conta)
create table if not exists public.whatsapp_vinculos (
  profissional_id  uuid primary key references public.profiles(id) on delete cascade,
  telefone         text not null unique,          -- como a Meta manda (wa_id): só dígitos, com 55
  conectado_em     timestamptz not null default now()
);

-- Código de 6 dígitos para conectar (vale 15 minutos)
create table if not exists public.whatsapp_codigos (
  profissional_id  uuid primary key references public.profiles(id) on delete cascade,
  codigo           text not null,
  expira_em        timestamptz not null
);

-- Conversa recente (a assistente lembra das últimas falas das últimas 24 h)
create table if not exists public.whatsapp_conversa (
  id               bigint generated always as identity primary key,
  profissional_id  uuid not null references public.profiles(id) on delete cascade,
  papel            text not null check (papel in ('voce', 'assistente')),
  texto            text not null,
  criado_em        timestamptz not null default now()
);
create index if not exists whatsapp_conversa_prof_idx on public.whatsapp_conversa (profissional_id, criado_em desc);

-- Mudanças propostas pela assistente, esperando o "Confirmar" (botão do WhatsApp ou "sim")
create table if not exists public.whatsapp_propostas (
  id               uuid primary key default gen_random_uuid(),
  profissional_id  uuid not null references public.profiles(id) on delete cascade,
  dados            jsonb not null,
  situacao         text not null default 'pendente' check (situacao in ('pendente', 'confirmada', 'recusada', 'erro', 'vencida')),
  criada_em        timestamptz not null default now()
);
create index if not exists whatsapp_propostas_prof_idx on public.whatsapp_propostas (profissional_id, criada_em desc);

-- Mensagens já recebidas (a Meta pode reenviar a mesma; assim não responde duas vezes)
create table if not exists public.whatsapp_recebidas (
  wamid            text primary key,
  recebida_em      timestamptz not null default now()
);

alter table public.whatsapp_vinculos  enable row level security;
alter table public.whatsapp_codigos   enable row level security;
alter table public.whatsapp_conversa  enable row level security;
alter table public.whatsapp_propostas enable row level security;
alter table public.whatsapp_recebidas enable row level security;

-- Única permissão para a profissional: ver se o próprio WhatsApp está conectado
create policy "whatsapp_vinculos: ver o próprio" on public.whatsapp_vinculos
  for select to authenticated using (auth.uid() = profissional_id);
