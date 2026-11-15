-- =============================================================================
-- 0030_aviso_vencido.sql — e-mail "sua assinatura venceu" (15/11/2026)
--   Os avisos de cobrança do Asaas foram desligados; a Vaguinha avisa 3 dias antes (aviso_vencimento_para)
--   e, agora, 1 dia depois de vencer sem pagamento. Esta coluna guarda para qual vencimento o e-mail
--   de "venceu" já saiu, para não repetir.
-- =============================================================================

alter table public.profiles
  add column if not exists aviso_vencido_para date;

comment on column public.profiles.aviso_vencido_para is 'ativa_ate para a qual o e-mail "sua assinatura venceu" já foi enviado (evita repetir).';
