-- =============================================================================
-- 0034_aviso_parou.sql — mensagem automática para quem "Parou" (19/11/2026)
--   Quem começou a configurar a agenda e depois parou recebe, uma vez, a mensagem pronta
--   "vaguinha_retomar_uso" pelo WhatsApp oficial (a Serena pergunta o que faltou).
--   * ativacao_envios.tipo passa a aceitar 'parou' (histórico na tela da conta).
--   * profiles.aviso_parou_em: quando a mensagem saiu, para não mandar de novo.
-- =============================================================================

alter table public.ativacao_envios
  drop constraint if exists ativacao_envios_tipo_check;

alter table public.ativacao_envios
  add constraint ativacao_envios_tipo_check
  check (tipo in ('ajuda_inicio', 'feedback_teste', 'parou'));

alter table public.profiles
  add column if not exists aviso_parou_em timestamptz;

comment on column public.profiles.aviso_parou_em is 'Quando saiu a mensagem automática para quem parou de usar (uma vez por conta).';
