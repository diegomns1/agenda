-- =============================================================================
-- 0021_rastreio_anuncios.sql — Pixel da Meta e API de Conversões (11/11/2026)
--   origem_anuncio: de onde a profissional veio (utm_*, fbclid, cookies da Meta, consentimento, IP/navegador do cadastro).
--                   Gravado pelo servidor no cadastro; usado no funil por anúncio do Painel do dono e para mandar à
--                   Meta os eventos que acontecem depois (aprovação = StartTrial, primeiro pagamento = Subscribe).
--   eventos_meta:   quais eventos já foram enviados à Meta (para nunca mandar duas vezes).
-- =============================================================================

alter table public.profiles add column if not exists origem_anuncio jsonb;
alter table public.profiles add column if not exists eventos_meta jsonb not null default '{}'::jsonb;
