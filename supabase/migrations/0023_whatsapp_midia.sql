-- =============================================================================
-- 0023_whatsapp_midia.sql — Central do WhatsApp com foto, áudio, documento e opções da conversa (13/11/2026)
--   * whatsapp_mensagens ganha o tipo da mensagem, o arquivo (no bucket privado "whatsapp"),
--     a transcrição do áudio e a situação de entrega (enviada → entregue → lida).
--   * whatsapp_contatos ganha "bloqueado" (o robô ignora e a Meta bloqueia o número).
--   * Bucket "whatsapp" PRIVADO: só o servidor (service_role) lê e grava. A Central mostra os arquivos
--     por links temporários. Arquivos com mais de 90 dias são apagados (fica o texto e a transcrição).
-- =============================================================================

alter table public.whatsapp_mensagens
  add column if not exists tipo text not null default 'texto'
    check (tipo in ('texto', 'imagem', 'audio', 'video', 'documento', 'figurinha', 'localizacao', 'contato', 'outro')),
  add column if not exists midia_path text,          -- caminho no bucket "whatsapp" (null depois de 90 dias)
  add column if not exists midia_mime text,
  add column if not exists midia_nome text,          -- nome do documento, quando houver
  add column if not exists midia_bytes int,
  add column if not exists transcricao text,         -- áudio virado texto (etapa 3)
  add column if not exists status text
    check (status is null or status in ('enviada', 'entregue', 'lida', 'falhou'));

create index if not exists whatsapp_mensagens_wamid_idx on public.whatsapp_mensagens (wamid) where wamid is not null;
create index if not exists whatsapp_mensagens_midia_idx on public.whatsapp_mensagens (criado_em) where midia_path is not null;

alter table public.whatsapp_contatos
  add column if not exists bloqueado boolean not null default false,
  add column if not exists bloqueado_em timestamptz;

insert into storage.buckets (id, name, public, file_size_limit)
values ('whatsapp', 'whatsapp', false, 16777216) -- 16 MB (limite de áudio/imagem da Meta)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit;
-- sem políticas no bucket: só a service_role (servidor) acessa
