-- =============================================================================
-- 0026_lembrete_automatico.sql — lembrete que sai sozinho do WhatsApp da profissional (15/11/2026)
--   whatsapp_conexoes: liga/desliga e quanto tempo antes manda (24, 12, 3 ou 2 horas).
--   agendamentos: quando o lembrete automático saiu (ou por que não saiu). Ao sair, também marca
--   cliente_avisada_em, o mesmo "check" da lista de Lembretes.
-- =============================================================================

alter table public.whatsapp_conexoes
  add column if not exists lembrete_ativo boolean not null default false,  -- ela liga quando quiser
  add column if not exists lembrete_horas smallint not null default 24;

alter table public.whatsapp_conexoes drop constraint if exists whatsapp_conexoes_lembrete_horas_check;
alter table public.whatsapp_conexoes
  add constraint whatsapp_conexoes_lembrete_horas_check check (lembrete_horas in (2, 3, 12, 24));

alter table public.agendamentos
  add column if not exists lembrete_auto_em timestamptz,
  add column if not exists lembrete_auto_erro text;

-- a busca do envio automático: atendimentos agendados ainda sem lembrete
create index if not exists agendamentos_lembrete_auto_idx
  on public.agendamentos (profissional_id, inicio)
  where tipo = 'atendimento' and status = 'agendado' and lembrete_auto_em is null and cliente_avisada_em is null;
