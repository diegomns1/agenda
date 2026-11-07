-- =============================================================================
-- 0008_planos.sql — planos comerciais do Vaguinha
--   teste         grátis, tudo liberado durante o período de testes
--   essencial     R$ 19,90 — perfil, serviços, clientes e agenda
--   profissional  R$ 29,90 — + agendamento pela cliente + lembretes
--   premium       R$ 39,90 — + stories
-- =============================================================================

alter table public.profiles drop constraint if exists profiles_plano_check;

-- valores antigos (mensal/trimestral/anual eram periodicidade, não nível) viram "profissional"
update public.profiles set plano = 'profissional' where plano in ('mensal', 'trimestral', 'anual');

alter table public.profiles
  add constraint profiles_plano_check
  check (plano in ('teste', 'essencial', 'profissional', 'premium'));

alter table public.profiles alter column plano set default 'teste';

comment on column public.profiles.plano is 'teste | essencial | profissional | premium (ver src/lib/planos.ts)';
