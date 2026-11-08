-- =============================================================================
-- 0015_historico_agendamentos.sql — histórico de tudo que acontece com os atendimentos
--   Alimenta os Relatórios (Premium) e o aviso "vagou um horário" na tela Hoje.
--   Um trigger grava os eventos sozinho, venha a mudança do painel, do link público ou do cron.
-- =============================================================================

create table if not exists public.agendamento_eventos (
  id                  uuid primary key default gen_random_uuid(),
  profissional_id     uuid not null references public.profiles(id) on delete cascade,
  agendamento_id      uuid,                       -- sem FK: o evento sobrevive à exclusão do atendimento
  tipo                text not null check (tipo in ('marcado', 'confirmado', 'recusado', 'remarcado', 'cancelado', 'excluido', 'faltou', 'concluido')),
  origem              text,                       -- 'painel' | 'online' (de onde veio o atendimento)
  cliente_id          uuid,
  cliente_nome        text,
  servico_nome        text,
  valor               numeric(10,2),
  inicio_anterior     timestamptz,                -- horário que ficou livre (remarcado/cancelado/excluido)
  fim_anterior        timestamptz,
  inicio              timestamptz,                -- horário atual / novo
  fim                 timestamptz,
  vaga_dispensada_em  timestamptz,                -- a profissional tirou o aviso "vagou" da tela Hoje
  created_at          timestamptz not null default now()
);

create index if not exists agendamento_eventos_prof_idx on public.agendamento_eventos (profissional_id, created_at desc);
create index if not exists agendamento_eventos_vagas_idx on public.agendamento_eventos (profissional_id, inicio_anterior)
  where tipo in ('remarcado', 'cancelado', 'excluido') and vaga_dispensada_em is null;

alter table public.agendamento_eventos enable row level security;

create policy "eventos: ver os próprios"
  on public.agendamento_eventos for select to authenticated
  using (auth.uid() = profissional_id);

-- só para marcar "dispensar aviso de vaga"
create policy "eventos: atualizar os próprios"
  on public.agendamento_eventos for update to authenticated
  using (auth.uid() = profissional_id)
  with check (auth.uid() = profissional_id);

-- -----------------------------------------------------------------------------
-- Trigger: grava os eventos (security definer: insere mesmo sem policy de insert)
-- -----------------------------------------------------------------------------
create or replace function public.registrar_evento_agendamento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.agendamentos;
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  if r.tipo <> 'atendimento' then
    return null;
  end if;

  if tg_op = 'INSERT' then
    insert into public.agendamento_eventos (profissional_id, agendamento_id, tipo, origem, cliente_id, cliente_nome, servico_nome, valor, inicio, fim)
    values (new.profissional_id, new.id, 'marcado', new.origem, new.cliente_id, new.cliente_nome, new.servico_nome, new.valor, new.inicio, new.fim);
    return null;
  end if;

  if tg_op = 'DELETE' then
    -- apagar um atendimento ativo também libera o horário
    if old.status in ('agendado', 'pendente') then
      insert into public.agendamento_eventos (profissional_id, agendamento_id, tipo, origem, cliente_id, cliente_nome, servico_nome, valor, inicio_anterior, fim_anterior)
      values (old.profissional_id, old.id, 'excluido', old.origem, old.cliente_id, old.cliente_nome, old.servico_nome, old.valor, old.inicio, old.fim);
    end if;
    return null;
  end if;

  -- UPDATE: mudança de horário
  if (new.inicio is distinct from old.inicio or new.fim is distinct from old.fim) and new.status <> 'cancelado' then
    insert into public.agendamento_eventos (profissional_id, agendamento_id, tipo, origem, cliente_id, cliente_nome, servico_nome, valor, inicio_anterior, fim_anterior, inicio, fim)
    values (new.profissional_id, new.id, 'remarcado', new.origem, new.cliente_id, new.cliente_nome, new.servico_nome, new.valor, old.inicio, old.fim, new.inicio, new.fim);
  end if;

  -- UPDATE: mudança de situação
  if new.status is distinct from old.status then
    insert into public.agendamento_eventos (profissional_id, agendamento_id, tipo, origem, cliente_id, cliente_nome, servico_nome, valor, inicio_anterior, fim_anterior, inicio, fim)
    values (
      new.profissional_id, new.id,
      case
        when new.status = 'cancelado' and old.status = 'pendente' then 'recusado'
        when new.status = 'cancelado' then 'cancelado'
        when new.status = 'agendado' and old.status = 'pendente' then 'confirmado'
        when new.status = 'faltou' then 'faltou'
        when new.status = 'concluido' then 'concluido'
        else 'marcado' -- ex.: reativou um cancelado
      end,
      new.origem, new.cliente_id, new.cliente_nome, new.servico_nome, new.valor,
      case when new.status = 'cancelado' then old.inicio end,
      case when new.status = 'cancelado' then old.fim end,
      new.inicio, new.fim
    );
  end if;

  return null;
end;
$$;

create trigger agendamentos_registrar_evento
  after insert or update or delete on public.agendamentos
  for each row execute function public.registrar_evento_agendamento();

-- -----------------------------------------------------------------------------
-- Histórico aproximado do que já existia (para os relatórios de novembro não ficarem vazios)
-- -----------------------------------------------------------------------------
insert into public.agendamento_eventos (profissional_id, agendamento_id, tipo, origem, cliente_id, cliente_nome, servico_nome, valor, inicio, fim, created_at)
select a.profissional_id, a.id, 'marcado', a.origem, a.cliente_id, a.cliente_nome, a.servico_nome, a.valor, a.inicio, a.fim, a.created_at
  from public.agendamentos a
 where a.tipo = 'atendimento'
   and not exists (select 1 from public.agendamento_eventos e where e.agendamento_id = a.id);

insert into public.agendamento_eventos (profissional_id, agendamento_id, tipo, origem, cliente_id, cliente_nome, servico_nome, valor, inicio_anterior, fim_anterior, inicio, fim, created_at, vaga_dispensada_em)
select a.profissional_id, a.id, 'cancelado', a.origem, a.cliente_id, a.cliente_nome, a.servico_nome, a.valor, a.inicio, a.fim, a.inicio, a.fim, a.updated_at, now()
  from public.agendamentos a
 where a.tipo = 'atendimento' and a.status = 'cancelado'
   and not exists (select 1 from public.agendamento_eventos e where e.agendamento_id = a.id and e.tipo = 'cancelado');
