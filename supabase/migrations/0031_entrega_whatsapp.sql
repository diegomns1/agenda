-- =============================================================================
-- 0031_entrega_whatsapp.sql — a mensagem chegou mesmo? (15/11/2026)
--   A Meta aceita o envio na hora e só depois avisa se entregou, se a pessoa leu ou se falhou
--   (ex.: problema na forma de pagamento da conta do WhatsApp). Até aqui o painel só mostrava "enviada".
--   * whatsapp_mensagens.erro: o motivo, quando a Meta avisa que não entregou.
--   * ativacao_envios.wamid: o id da mensagem na Meta, para marcar o envio como "não foi" quando ela falhar.
-- =============================================================================

alter table public.whatsapp_mensagens
  add column if not exists erro text;

alter table public.ativacao_envios
  add column if not exists wamid text;

create index if not exists ativacao_envios_wamid_idx on public.ativacao_envios (wamid) where wamid is not null;

comment on column public.whatsapp_mensagens.erro is 'Motivo da falha de entrega avisado pela Meta (status = falhou).';
comment on column public.ativacao_envios.wamid is 'Id da mensagem na Meta: permite marcar ok = false quando a Meta avisa que não entregou.';
