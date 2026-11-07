-- =============================================================================
-- 0005_agendamentos.sql — atendimentos e bloqueios na mesma tabela,
-- com regra anti-conflito garantida pelo banco (EXCLUDE + btree_gist)
-- =============================================================================

create extension if not exists btree_gist;

create table public.agendamentos (
  id                      uuid primary key default gen_random_uuid(),
  profissional_id         uuid not null references public.profiles(id) on delete cascade,
  tipo                    text not null check (tipo in ('atendimento', 'bloqueio')),

  -- atendimento
  cliente_id              uuid references public.clientes(id) on delete set null,
  cliente_nome            text,                 -- cópia no momento da marcação (histórico sobrevive à exclusão da cliente)
  servico_id              uuid references public.servicos(id) on delete restrict,
  servico_nome            text,                 -- cópia (se o serviço for renomeado, o histórico não muda)
  valor                   numeric(10,2),        -- cópia do valor na marcação

  -- bloqueio
  titulo                  text,

  inicio                  timestamptz not null,
  fim                     timestamptz not null,
  status                  text not null default 'agendado'
                          check (status in ('agendado', 'concluido', 'cancelado', 'faltou')),
  observacoes             text,

  -- lembretes (módulo 6)
  lembrete_1d_enviado_em  timestamptz,
  lembrete_1h_enviado_em  timestamptz,
  cliente_avisada_em      timestamptz,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint agendamentos_periodo_valido check (fim > inicio),
  constraint agendamentos_atendimento_tem_cliente
    check (tipo = 'bloqueio' or cliente_nome is not null),
  constraint agendamentos_bloqueio_tem_titulo
    check (tipo = 'atendimento' or titulo is not null),

  -- Sem conflito: dois registros da mesma profissional não podem se sobrepor,
  -- exceto se um deles estiver cancelado. Vale para atendimento × atendimento
  -- e atendimento × bloqueio.
  constraint agendamentos_sem_conflito
    exclude using gist (
      profissional_id with =,
      tstzrange(inicio, fim, '[)') with &&
    ) where (status <> 'cancelado')
);

comment on table public.agendamentos is 'Atendimentos (tipo=atendimento) e bloqueios (tipo=bloqueio). Conflito de horário é impedido pelo EXCLUDE.';

create index agendamentos_profissional_inicio_idx on public.agendamentos (profissional_id, inicio);
create index agendamentos_cliente_idx on public.agendamentos (cliente_id, inicio desc);
create index agendamentos_lembretes_idx on public.agendamentos (inicio) where status = 'agendado' and tipo = 'atendimento';

create trigger agendamentos_set_updated_at
  before update on public.agendamentos
  for each row execute function public.set_updated_at();

alter table public.agendamentos enable row level security;

create policy "agendamentos: ver os próprios ou admin"
  on public.agendamentos for select
  to authenticated
  using (auth.uid() = profissional_id or public.is_admin());

create policy "agendamentos: criar os próprios"
  on public.agendamentos for insert
  to authenticated
  with check (auth.uid() = profissional_id);

create policy "agendamentos: editar os próprios ou admin"
  on public.agendamentos for update
  to authenticated
  using (auth.uid() = profissional_id or public.is_admin())
  with check (auth.uid() = profissional_id or public.is_admin());

create policy "agendamentos: apagar os próprios ou admin"
  on public.agendamentos for delete
  to authenticated
  using (auth.uid() = profissional_id or public.is_admin());
