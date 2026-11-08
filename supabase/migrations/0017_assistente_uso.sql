-- =============================================================================
-- 0017_assistente_uso.sql — controle de uso do Assistente de IA (Premium)
--   Uma linha por profissional por dia: quantas mensagens e quantos tokens.
--   Serve para o limite diário (protege o crédito da API) e para o Painel do dono.
--   Gravado só pelo servidor com a sessão da profissional (RLS própria).
-- =============================================================================

create table if not exists public.assistente_uso (
  profissional_id  uuid not null references public.profiles(id) on delete cascade,
  dia              date not null,
  mensagens        int not null default 0,
  tokens_entrada   bigint not null default 0,
  tokens_saida     bigint not null default 0,
  custo_usd        numeric(10,4) not null default 0,
  updated_at       timestamptz not null default now(),
  primary key (profissional_id, dia)
);

alter table public.assistente_uso enable row level security;

create policy "assistente_uso: ver o próprio" on public.assistente_uso
  for select to authenticated using (auth.uid() = profissional_id);
create policy "assistente_uso: criar o próprio" on public.assistente_uso
  for insert to authenticated with check (auth.uid() = profissional_id);
create policy "assistente_uso: atualizar o próprio" on public.assistente_uso
  for update to authenticated using (auth.uid() = profissional_id) with check (auth.uid() = profissional_id);
