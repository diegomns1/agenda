-- =============================================================================
-- 0022_sugestoes.sql — "Sugestões de melhorias" (12/11/2026)
--   A profissional escreve a ideia no painel; o Diego lê em Admin > Sugestões.
--   Nome, e-mail e WhatsApp são copiados no envio: a sugestão continua dizendo quem foi
--   mesmo se a conta for excluída depois (profissional_id vira null).
--   Também estende para 5 dias os testes grátis que estão rodando (o teste passou de 3 para 5 dias).
-- =============================================================================

create table if not exists public.sugestoes (
  id               uuid primary key default gen_random_uuid(),
  profissional_id  uuid references public.profiles(id) on delete set null,
  nome             text not null,
  email            text,
  telefone         text,
  texto            text not null check (char_length(texto) between 3 and 2000),
  created_at       timestamptz not null default now(),
  lida_em          timestamptz
);

create index if not exists sugestoes_created_idx on public.sugestoes (created_at desc);

alter table public.sugestoes enable row level security;

-- a profissional só cria a própria; não lê nem altera (quem lê é o admin)
create policy "sugestoes: criar a própria" on public.sugestoes
  for insert to authenticated with check (auth.uid() = profissional_id);
create policy "sugestoes: admin lê" on public.sugestoes
  for select to authenticated using (public.is_admin());
create policy "sugestoes: admin marca como lida" on public.sugestoes
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "sugestoes: admin apaga" on public.sugestoes
  for delete to authenticated using (public.is_admin());

-- Teste de 3 → 5 dias: quem está no teste agora ganha os 2 dias a mais.
-- O trigger profiles_protege_campos_admin só deixa a service_role mudar a validade: no SQL Editor,
-- avisamos que este bloco roda como service_role (vale só até o fim desta transação).
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.profiles
   set ativa_ate = ativa_ate + 2
 where plano = 'teste'
   and status = 'aprovada'
   and ativa_ate >= (now() at time zone 'America/Sao_Paulo')::date;
