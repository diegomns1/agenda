-- =============================================================================
-- 0009_cores_padrao.sql — cores padrão das novas contas seguem a marca Vaguinha
-- =============================================================================

alter table public.profiles alter column cor_primaria set default '#702D50';
alter table public.profiles alter column cor_secundaria set default '#FCF6F1';

-- contas que ainda estavam com o padrão antigo passam para o novo
update public.profiles
   set cor_primaria = '#702D50', cor_secundaria = '#FCF6F1'
 where cor_primaria = '#C2185B' and cor_secundaria = '#FCE4EC';
