-- =============================================================================
-- 0029_imagens_ia.sql — "Criar com IA" nos Stories (Premium), 15/11/2026
--   Chat de geração de imagem (OpenAI). Uma linha por pedido: o texto, a imagem gerada (bucket privado
--   "imagens-ia") e a conversa a que pertence (para ajustar a última imagem). 30 por mês por profissional;
--   pedido que deu erro não conta. As fotos anexadas não são guardadas, só a imagem final.
-- =============================================================================

create table if not exists public.imagens_ia (
  id               uuid primary key default gen_random_uuid(),
  profissional_id  uuid not null references public.profiles(id) on delete cascade,
  conversa_id      uuid not null,
  pedido           text not null,
  anexos           smallint not null default 0,
  estado           text not null default 'gerando' check (estado in ('gerando', 'pronta', 'erro')),
  erro             text,
  imagem_path      text,
  tokens           integer,
  criado_em        timestamptz not null default now(),
  pronta_em        timestamptz
);
create index if not exists imagens_ia_prof_idx on public.imagens_ia (profissional_id, criado_em desc);
create index if not exists imagens_ia_conversa_idx on public.imagens_ia (conversa_id, criado_em);

alter table public.imagens_ia enable row level security;
drop policy if exists "imagens_ia: ver as próprias" on public.imagens_ia;
create policy "imagens_ia: ver as próprias" on public.imagens_ia
  for select to authenticated using (profissional_id = auth.uid());
-- gravar e apagar: só o servidor (service_role)

-- bucket privado (a tela mostra por link temporário)
insert into storage.buckets (id, name, public, file_size_limit)
values ('imagens-ia', 'imagens-ia', false, 10485760)
on conflict (id) do nothing;
