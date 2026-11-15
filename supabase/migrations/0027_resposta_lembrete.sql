-- =============================================================================
-- 0027_resposta_lembrete.sql — resposta da cliente ao lembrete automático (15/11/2026)
--   agendamentos: confirmou (respondeu SIM) e a resposta dela ao lembrete (só essa mensagem, até 300 letras).
--   clientes: pediu para não receber mais lembretes automáticos (respondeu "parar").
--   whatsapp_conexoes: versão dos avisos ligados na Evolution (2 = conexão + respostas).
-- =============================================================================

alter table public.agendamentos
  add column if not exists cliente_confirmou_em timestamptz,
  add column if not exists resposta_cliente text,
  add column if not exists resposta_cliente_em timestamptz;

alter table public.clientes
  add column if not exists sem_lembrete_auto boolean not null default false;

alter table public.whatsapp_conexoes
  add column if not exists avisos_versao smallint not null default 1;

-- Remarcou (mudou o início): o lembrete automático e a confirmação valem para o horário antigo, então recomeçam.
-- O "avisada" só volta a ficar pendente se quem avisou foi o lembrete automático (o check manual continua).
create or replace function public.recomecar_lembrete_auto()
returns trigger
language plpgsql
as $$
begin
  if new.inicio is distinct from old.inicio then
    if old.lembrete_auto_em is not null and old.lembrete_auto_erro is null then
      new.cliente_avisada_em := null;
    end if;
    new.lembrete_auto_em := null;
    new.lembrete_auto_erro := null;
    new.cliente_confirmou_em := null;
    new.resposta_cliente := null;
    new.resposta_cliente_em := null;
  end if;
  return new;
end;
$$;

drop trigger if exists agendamentos_recomecar_lembrete_auto on public.agendamentos;
create trigger agendamentos_recomecar_lembrete_auto
  before update of inicio on public.agendamentos
  for each row execute function public.recomecar_lembrete_auto();
