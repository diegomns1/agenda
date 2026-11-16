-- =============================================================================
-- 0033_central_spam.sql — coluna "Robôs e spam" na Central do WhatsApp (16/11/2026)
--   Nova etapa 'spam' para os contatos que são outro robô (resposta automática de empresa) ou propaganda.
--   Quem está nessa coluna não recebe resposta da IA e não é apagado na limpeza automática de 5 dias
--   (se fosse apagado, voltaria como contato novo e a IA responderia de novo).
-- =============================================================================

alter table public.whatsapp_contatos
  drop constraint if exists whatsapp_contatos_etapa_check;

alter table public.whatsapp_contatos
  add constraint whatsapp_contatos_etapa_check
  check (etapa in ('robo', 'link', 'cadastrou', 'assinou', 'sem_resposta', 'spam'));

-- os que a IA já tinha pausado por parecerem robô vão para a coluna nova
update public.whatsapp_contatos
   set etapa = 'spam'
 where atendimento = 'humano'
   and motivo_ajuda like '🤖%';
