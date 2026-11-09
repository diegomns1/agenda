-- =============================================================================
-- 0018_mensagens_whatsapp.sql — endereço do atendimento e modelos de mensagem por situação
-- (sugestão da Layara, 09/11/2026). Não apaga nada: o lembrete atual (modelo_lembrete) continua valendo
-- até a profissional editar os modelos na tela Mensagens.
-- =============================================================================

alter table public.profiles
  add column if not exists endereco text,
  add column if not exists modelos_mensagem jsonb not null default '{}'::jsonb;

-- limites de tamanho (o app também valida)
do $$
begin
  alter table public.profiles add constraint profiles_endereco_tamanho check (endereco is null or char_length(endereco) <= 200);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.profiles add constraint profiles_modelos_mensagem_objeto check (jsonb_typeof(modelos_mensagem) = 'object');
exception when duplicate_object then null;
end $$;
