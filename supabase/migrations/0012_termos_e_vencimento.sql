-- =============================================================================
-- 0012_termos_e_vencimento.sql — etapa 4
--   * aceite dos Termos de Uso / Política de Privacidade no cadastro
--   * controle do aviso de vencimento por e-mail (enviado pelo cron)
-- =============================================================================

alter table public.profiles
  add column if not exists termos_aceitos_em     timestamptz,
  add column if not exists termos_versao         text,
  add column if not exists aviso_vencimento_para date;

comment on column public.profiles.termos_aceitos_em is 'Quando a profissional aceitou os termos (vem do cadastro).';
comment on column public.profiles.termos_versao is 'Versão dos termos aceita (data AAAA-MM-DD, ver src/lib/legal.ts).';
comment on column public.profiles.aviso_vencimento_para is 'ativa_ate para a qual o e-mail de vencimento já foi enviado (evita repetir).';

-- Trigger de criação do perfil: igual à 0010, agora gravando o aceite dos termos
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  candidato text;
  n int := 1;
  nome_final text;
  aceite timestamptz;
begin
  nome_final := coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1));
  base := left(coalesce(public.gerar_slug(nome_final), 'profissional'), 36);
  if length(base) < 3 then base := base || '-vaguinha'; end if;
  candidato := base;
  while exists (select 1 from public.profiles where slug = candidato) loop
    n := n + 1; candidato := base || '-' || n;
  end loop;

  begin
    aceite := (new.raw_user_meta_data ->> 'termos_aceitos_em')::timestamptz;
  exception when others then
    aceite := null;
  end;

  insert into public.profiles (id, email, nome, telefone, slug, termos_aceitos_em, termos_versao)
  values (
    new.id,
    new.email,
    nome_final,
    nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'telefone', ''), '\D', '', 'g'), ''),
    candidato,
    aceite,
    nullif(new.raw_user_meta_data ->> 'termos_versao', '')
  );
  return new;
end;
$$;
