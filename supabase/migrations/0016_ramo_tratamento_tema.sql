-- =============================================================================
-- 0016_ramo_tratamento_tema.sql — quem é a profissional
--   ramo        área de atuação (lista em src/lib/ramos.ts) ou 'outro' + ramo_outro
--   tratamento  ela | ele | neutro (ajusta textos como "Bem-vinda/Bem-vindo")
--   tema        cor do painel: rosa | grafite | azul | verde | lavanda
--   Vêm do cadastro (metadata do signUp) e podem ser trocados no Perfil.
-- =============================================================================

alter table public.profiles
  add column if not exists ramo       text,
  add column if not exists ramo_outro text,
  add column if not exists tratamento text check (tratamento in ('ela', 'ele', 'neutro')),
  add column if not exists tema       text not null default 'rosa'
                                      check (tema in ('rosa', 'grafite', 'azul', 'verde', 'lavanda'));

create index if not exists profiles_ramo_idx on public.profiles (ramo);

-- Trigger de criação do perfil: igual à 0012, agora com ramo, tratamento e tema
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
  v_tratamento text;
  v_tema text;
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

  v_tratamento := new.raw_user_meta_data ->> 'tratamento';
  if v_tratamento not in ('ela', 'ele', 'neutro') then v_tratamento := null; end if;
  v_tema := coalesce(new.raw_user_meta_data ->> 'tema', case when v_tratamento = 'ele' then 'grafite' else 'rosa' end);
  if v_tema not in ('rosa', 'grafite', 'azul', 'verde', 'lavanda') then v_tema := 'rosa'; end if;

  insert into public.profiles (id, email, nome, telefone, slug, termos_aceitos_em, termos_versao, ramo, ramo_outro, tratamento, tema)
  values (
    new.id,
    new.email,
    nome_final,
    nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'telefone', ''), '\D', '', 'g'), ''),
    candidato,
    aceite,
    nullif(new.raw_user_meta_data ->> 'termos_versao', ''),
    nullif(left(new.raw_user_meta_data ->> 'ramo', 40), ''),
    nullif(left(trim(new.raw_user_meta_data ->> 'ramo_outro'), 60), ''),
    v_tratamento,
    v_tema
  );
  return new;
end;
$$;
