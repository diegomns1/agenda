-- =============================================================================
-- 0013_cobranca_asaas.sql — etapa 5: assinatura paga via Asaas
--   * profiles ganha os ids do Asaas, o plano assinado e o CPF/CNPJ (exigido pelo Asaas)
--   * tabela cobrancas: espelho das cobranças (Pix/boleto/cartão) para mostrar no painel
--   O acesso (plano + ativa_ate) continua sendo liberado só por service_role/admin:
--   o webhook do Asaas usa service_role.
-- =============================================================================

alter table public.profiles
  add column if not exists asaas_customer_id     text,
  add column if not exists asaas_subscription_id text,
  add column if not exists plano_assinado        text check (plano_assinado in ('essencial', 'profissional', 'premium')),
  add column if not exists cpf_cnpj              text;

create unique index if not exists profiles_asaas_customer_idx on public.profiles (asaas_customer_id) where asaas_customer_id is not null;

comment on column public.profiles.plano_assinado is 'Plano da assinatura ativa no Asaas (vira `plano` quando o pagamento é confirmado).';

create table if not exists public.cobrancas (
  id               uuid primary key default gen_random_uuid(),
  profissional_id  uuid not null references public.profiles(id) on delete cascade,
  asaas_id         text not null unique,          -- pay_xxx
  assinatura_id    text,                          -- sub_xxx
  plano            text check (plano in ('essencial', 'profissional', 'premium')),
  valor            numeric(10,2) not null,
  vencimento       date not null,
  status           text not null,                 -- PENDING | CONFIRMED | RECEIVED | OVERDUE | REFUNDED | DELETED ...
  forma            text,                          -- PIX | BOLETO | CREDIT_CARD | UNDEFINED
  link             text,                          -- invoiceUrl (página de pagamento do Asaas)
  pago_em          timestamptz,
  liberou_acesso   boolean not null default false,-- true depois que ativa_ate foi estendida por esta cobrança
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists cobrancas_profissional_idx on public.cobrancas (profissional_id, vencimento desc);

create trigger cobrancas_set_updated_at
  before update on public.cobrancas
  for each row execute function public.set_updated_at();

alter table public.cobrancas enable row level security;

create policy "cobrancas: ver as próprias"
  on public.cobrancas for select to authenticated
  using (auth.uid() = profissional_id);

-- A profissional cria o espelho da primeira cobrança ao assinar; o resto é o webhook (service_role).
create policy "cobrancas: criar as próprias"
  on public.cobrancas for insert to authenticated
  with check (auth.uid() = profissional_id);

create policy "cobrancas: atualizar as próprias"
  on public.cobrancas for update to authenticated
  using (auth.uid() = profissional_id)
  with check (auth.uid() = profissional_id);
