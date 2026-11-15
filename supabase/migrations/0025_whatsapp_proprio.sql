-- =============================================================================
-- 0025_whatsapp_proprio.sql — WhatsApp da própria profissional conectado à Vaguinha (15/11/2026)
--   Para os lembretes automáticos saírem do número DELA (conexão por QR Code ou código, via Evolution API
--   no servidor). Uma linha por profissional. A sessão do WhatsApp em si fica na Evolution, não aqui.
--   Nenhuma mensagem nem contato é guardado: só o estado da conexão e o número conectado.
--   A profissional lê a própria linha; só o servidor (service_role) grava.
-- =============================================================================

create table if not exists public.whatsapp_conexoes (
  profissional_id   uuid primary key references public.profiles(id) on delete cascade,
  instancia         text not null unique,          -- nome da conexão na Evolution
  estado            text not null default 'desconectado'
                    check (estado in ('desconectado', 'conectando', 'conectado')),
  numero            text,                          -- número conectado (só dígitos, com 55)
  nome_perfil       text,                          -- nome do perfil no WhatsApp
  aceite_risco_em   timestamptz,                   -- marcou que está ciente do risco de bloqueio
  conectado_em      timestamptz,
  desconectado_em   timestamptz,
  motivo_queda      text,                          -- código que a Evolution informou na última queda
  aviso_queda_em    timestamptz,                   -- último push "seu WhatsApp desconectou"
  atualizado_em     timestamptz not null default now()
);

alter table public.whatsapp_conexoes enable row level security;

drop policy if exists "whatsapp_conexoes: ver a própria" on public.whatsapp_conexoes;
create policy "whatsapp_conexoes: ver a própria" on public.whatsapp_conexoes
  for select to authenticated using (profissional_id = auth.uid());
-- sem insert/update/delete para o usuário: quem grava é o servidor
