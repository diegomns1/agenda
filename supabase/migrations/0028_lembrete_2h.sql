-- =============================================================================
-- 0028_lembrete_2h.sql — lembrete automático em dois tempos, fixo: 1 dia antes e 2 horas antes (15/11/2026)
--   O de 1 dia continua em lembrete_auto_em/_erro; o de 2 horas usa as colunas novas.
--   A escolha de horário (whatsapp_conexoes.lembrete_horas) deixou de ser usada.
-- =============================================================================

alter table public.agendamentos
  add column if not exists lembrete_2h_em timestamptz,
  add column if not exists lembrete_2h_erro text;

-- Remarcou: os dois lembretes recomeçam
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
    new.lembrete_2h_em := null;
    new.lembrete_2h_erro := null;
    new.cliente_confirmou_em := null;
    new.resposta_cliente := null;
    new.resposta_cliente_em := null;
  end if;
  return new;
end;
$$;
