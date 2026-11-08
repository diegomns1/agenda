-- =============================================================================
-- 0014_teste_essencial.sql — o teste grátis passa a ter só os recursos do Essencial
-- (decisão do Diego em 07/11/2026: 3 dias, sem agendamento pela cliente, lembretes e stories).
-- A duração de 3 dias é aplicada pelo app na aprovação da conta (src/lib/planos.ts → DIAS_TESTE).
-- =============================================================================

create or replace function public.plano_tem_agendamento_online(p_plano text)
returns boolean language sql immutable as $$
  select p_plano in ('profissional', 'premium');
$$;

comment on column public.profiles.plano is
  'teste (3 dias, recursos do essencial) | essencial | profissional | premium (ver src/lib/planos.ts)';
