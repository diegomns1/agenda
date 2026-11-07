-- =============================================================================
-- 0004_clientes.sql — clientes da profissional
-- =============================================================================

create table public.clientes (
  id               uuid primary key default gen_random_uuid(),
  profissional_id  uuid not null references public.profiles(id) on delete cascade,
  nome             text not null check (char_length(nome) between 1 and 80),
  telefone         text check (telefone is null or telefone ~ '^[0-9]{10,15}$'), -- só dígitos, com DDI
  observacoes      text check (observacoes is null or char_length(observacoes) <= 1000),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.clientes is 'Clientes da profissional. Histórico de atendimentos vem de agendamentos.cliente_id.';

create index clientes_profissional_nome_idx on public.clientes (profissional_id, lower(nome));

-- Evita a mesma cliente duas vezes pelo WhatsApp (quando informado)
create unique index clientes_profissional_telefone_uidx
  on public.clientes (profissional_id, telefone)
  where telefone is not null;

create trigger clientes_set_updated_at
  before update on public.clientes
  for each row execute function public.set_updated_at();

alter table public.clientes enable row level security;

create policy "clientes: ver as próprias ou admin"
  on public.clientes for select
  to authenticated
  using (auth.uid() = profissional_id or public.is_admin());

create policy "clientes: criar as próprias"
  on public.clientes for insert
  to authenticated
  with check (auth.uid() = profissional_id);

create policy "clientes: editar as próprias ou admin"
  on public.clientes for update
  to authenticated
  using (auth.uid() = profissional_id or public.is_admin())
  with check (auth.uid() = profissional_id or public.is_admin());

create policy "clientes: apagar as próprias ou admin"
  on public.clientes for delete
  to authenticated
  using (auth.uid() = profissional_id or public.is_admin());
