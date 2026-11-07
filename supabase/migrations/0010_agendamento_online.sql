-- =============================================================================
-- 0010_agendamento_online.sql — a cliente agenda pelo link público da profissional
--   • profiles: slug público, ativar/desativar, modo de confirmação, antecedência mínima
--   • agendamentos: status 'pendente' (aguardando confirmação) e coluna origem
--   • funções SECURITY DEFINER para o site público (anon) sem expor dados de outras clientes
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists slug text,
  add column if not exists agendamento_online boolean not null default true,
  add column if not exists confirmacao_online text not null default 'manual'
    check (confirmacao_online in ('automatica', 'manual')),
  add column if not exists antecedencia_min_horas int not null default 2
    check (antecedencia_min_horas between 0 and 72);

-- slug: minúsculas, números e hífen, 3 a 40 caracteres
alter table public.profiles drop constraint if exists profiles_slug_formato;
alter table public.profiles
  add constraint profiles_slug_formato check (slug is null or slug ~ '^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$');

create unique index if not exists profiles_slug_uidx on public.profiles (slug) where slug is not null;

-- gera um slug a partir de um texto (sem acentos, sem símbolos)
create or replace function public.gerar_slug(texto text)
returns text
language sql
immutable
as $$
  select nullif(
    trim(both '-' from
      regexp_replace(
        lower(translate(coalesce(texto, ''),
          'áàâãäåéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
          'aaaaaaeeeeiiiiooooouuuucnAAAAAAEEEEIIIIOOOOOUUUUCN')),
        '[^a-z0-9]+', '-', 'g')
    ), '');
$$;

-- preenche slug das contas existentes (nome do negócio, senão nome), garantindo unicidade
do $$
declare
  r record;
  base text;
  candidato text;
  n int;
begin
  for r in select id, nome, nome_negocio from public.profiles where slug is null loop
    base := left(coalesce(public.gerar_slug(r.nome_negocio), public.gerar_slug(r.nome), 'profissional'), 36);
    if length(base) < 3 then base := base || '-vaguinha'; end if;
    candidato := base; n := 1;
    while exists (select 1 from public.profiles where slug = candidato) loop
      n := n + 1; candidato := base || '-' || n;
    end loop;
    update public.profiles set slug = candidato where id = r.id;
  end loop;
end $$;

-- novas contas: slug automático no trigger de criação
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
begin
  nome_final := coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1));
  base := left(coalesce(public.gerar_slug(nome_final), 'profissional'), 36);
  if length(base) < 3 then base := base || '-vaguinha'; end if;
  candidato := base;
  while exists (select 1 from public.profiles where slug = candidato) loop
    n := n + 1; candidato := base || '-' || n;
  end loop;

  insert into public.profiles (id, email, nome, telefone, slug)
  values (
    new.id,
    new.email,
    nome_final,
    nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'telefone', ''), '\D', '', 'g'), ''),
    candidato
  );
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- agendamentos: status pendente + origem
-- -----------------------------------------------------------------------------
alter table public.agendamentos drop constraint if exists agendamentos_status_check;
alter table public.agendamentos
  add constraint agendamentos_status_check
  check (status in ('pendente', 'agendado', 'concluido', 'cancelado', 'faltou'));

alter table public.agendamentos
  add column if not exists origem text not null default 'painel' check (origem in ('painel', 'online'));

-- (o EXCLUDE anti-conflito já ignora só 'cancelado': pendente também reserva o horário)

-- -----------------------------------------------------------------------------
-- Funções públicas (chamadas pelo site com a chave anon)
-- -----------------------------------------------------------------------------

-- Planos que incluem agendamento online (espelha src/lib/planos.ts)
create or replace function public.plano_tem_agendamento_online(p_plano text)
returns boolean language sql immutable as $$
  select p_plano in ('teste', 'profissional', 'premium');
$$;

-- Dados públicos da profissional + serviços ativos. NULL se não existe / não atende online.
create or replace function public.perfil_publico(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', p.id,
    'slug', p.slug,
    'nome', p.nome,
    'nome_negocio', p.nome_negocio,
    'instagram', p.instagram,
    'telefone', p.telefone,
    'logo_url', p.logo_url,
    'cor_primaria', p.cor_primaria,
    'cor_secundaria', p.cor_secundaria,
    'expediente', p.expediente,
    'intervalo_grade_min', p.intervalo_grade_min,
    'confirmacao_online', p.confirmacao_online,
    'antecedencia_min_horas', p.antecedencia_min_horas,
    'servicos', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'nome', s.nome, 'duracao_min', s.duracao_min, 'valor', s.valor) order by s.ordem, s.created_at)
      from public.servicos s where s.profissional_id = p.id and s.ativo
    ), '[]'::jsonb)
  )
  from public.profiles p
  where p.slug = p_slug
    and p.status = 'aprovada'
    and (p.ativa_ate is null or p.ativa_ate >= (now() at time zone 'America/Sao_Paulo')::date)
    and p.agendamento_online
    and public.plano_tem_agendamento_online(p.plano);
$$;

-- Períodos ocupados (sem nenhum dado da cliente) entre dois instantes.
create or replace function public.horarios_ocupados(p_slug text, p_inicio timestamptz, p_fim timestamptz)
returns table (inicio timestamptz, fim timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select a.inicio, a.fim
  from public.agendamentos a
  join public.profiles p on p.id = a.profissional_id
  where p.slug = p_slug
    and a.status <> 'cancelado'
    and a.inicio < p_fim
    and a.fim > p_inicio;
$$;

-- Cria o pedido de agendamento vindo do link público.
-- Valida tudo no banco: profissional ativa, serviço dela, dentro do expediente, na grade,
-- com antecedência mínima, no máximo 60 dias à frente, e limite de pedidos pendentes por telefone.
create or replace function public.criar_agendamento_online(
  p_slug text,
  p_servico_id uuid,
  p_inicio timestamptz,
  p_nome text,
  p_telefone text,
  p_observacoes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil public.profiles%rowtype;
  v_servico public.servicos%rowtype;
  v_fim timestamptz;
  v_dia_semana text;
  v_cfg jsonb;
  v_local_inicio timestamp;
  v_min_inicio int;
  v_min_fim int;
  v_exp_inicio int;
  v_exp_fim int;
  v_cliente_id uuid;
  v_nome text := trim(p_nome);
  v_tel text := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
  v_status text;
  v_id uuid;
begin
  if v_nome is null or length(v_nome) < 2 then
    raise exception 'Informe seu nome' using errcode = 'P0001';
  end if;
  if length(v_tel) in (10, 11) then v_tel := '55' || v_tel; end if;
  if v_tel !~ '^[0-9]{12,15}$' then
    raise exception 'Informe um WhatsApp válido com DDD' using errcode = 'P0001';
  end if;

  select * into v_perfil from public.profiles p
   where p.slug = p_slug and p.status = 'aprovada' and p.agendamento_online
     and (p.ativa_ate is null or p.ativa_ate >= (now() at time zone 'America/Sao_Paulo')::date)
     and public.plano_tem_agendamento_online(p.plano);
  if not found then
    raise exception 'Agendamento online indisponível' using errcode = 'P0001';
  end if;

  select * into v_servico from public.servicos s
   where s.id = p_servico_id and s.profissional_id = v_perfil.id and s.ativo;
  if not found then
    raise exception 'Serviço indisponível' using errcode = 'P0001';
  end if;

  v_fim := p_inicio + make_interval(mins => v_servico.duracao_min);

  if p_inicio < now() + make_interval(hours => v_perfil.antecedencia_min_horas) then
    raise exception 'Esse horário precisa de pelo menos % h de antecedência', v_perfil.antecedencia_min_horas using errcode = 'P0001';
  end if;
  if p_inicio > now() + interval '60 days' then
    raise exception 'Só é possível agendar até 60 dias à frente' using errcode = 'P0001';
  end if;

  -- expediente do dia (em São Paulo)
  v_local_inicio := p_inicio at time zone 'America/Sao_Paulo';
  v_dia_semana := extract(dow from v_local_inicio)::int::text;
  v_cfg := v_perfil.expediente -> v_dia_semana;
  if v_cfg is null or not coalesce((v_cfg ->> 'ativo')::boolean, false) then
    raise exception 'A profissional não atende nesse dia' using errcode = 'P0001';
  end if;
  v_min_inicio := extract(hour from v_local_inicio)::int * 60 + extract(minute from v_local_inicio)::int;
  v_min_fim := v_min_inicio + v_servico.duracao_min;
  v_exp_inicio := split_part(v_cfg ->> 'inicio', ':', 1)::int * 60 + split_part(v_cfg ->> 'inicio', ':', 2)::int;
  v_exp_fim := split_part(v_cfg ->> 'fim', ':', 1)::int * 60 + split_part(v_cfg ->> 'fim', ':', 2)::int;
  if v_min_inicio < v_exp_inicio or v_min_fim > v_exp_fim then
    raise exception 'Horário fora do expediente' using errcode = 'P0001';
  end if;
  if (v_min_inicio - v_exp_inicio) % greatest(v_perfil.intervalo_grade_min, 5) <> 0 then
    raise exception 'Horário fora da grade' using errcode = 'P0001';
  end if;

  -- limite de pedidos pendentes/futuros por telefone (evita abuso)
  if (select count(*) from public.agendamentos a
       join public.clientes c on c.id = a.cliente_id
      where a.profissional_id = v_perfil.id and c.telefone = v_tel
        and a.status in ('pendente', 'agendado') and a.inicio > now()) >= 3 then
    raise exception 'Você já tem 3 horários futuros marcados. Fale com a profissional para mais.' using errcode = 'P0001';
  end if;

  -- cliente: reaproveita pelo telefone ou cria
  select id into v_cliente_id from public.clientes
   where profissional_id = v_perfil.id and telefone = v_tel limit 1;
  if v_cliente_id is null then
    insert into public.clientes (profissional_id, nome, telefone)
    values (v_perfil.id, v_nome, v_tel)
    returning id into v_cliente_id;
  end if;

  v_status := case when v_perfil.confirmacao_online = 'automatica' then 'agendado' else 'pendente' end;

  begin
    insert into public.agendamentos (
      profissional_id, tipo, cliente_id, cliente_nome, servico_id, servico_nome, valor,
      inicio, fim, status, observacoes, origem
    ) values (
      v_perfil.id, 'atendimento', v_cliente_id, v_nome, v_servico.id, v_servico.nome, v_servico.valor,
      p_inicio, v_fim, v_status, nullif(trim(coalesce(p_observacoes, '')), ''), 'online'
    ) returning id into v_id;
  exception when exclusion_violation then
    raise exception 'Esse horário acabou de ser ocupado. Escolha outro.' using errcode = 'P0001';
  end;

  return jsonb_build_object(
    'id', v_id,
    'status', v_status,
    'inicio', p_inicio,
    'fim', v_fim,
    'servico', v_servico.nome,
    'profissional_id', v_perfil.id,
    'telefone_profissional', v_perfil.telefone
  );
end;
$$;

revoke all on function public.perfil_publico(text) from public;
revoke all on function public.horarios_ocupados(text, timestamptz, timestamptz) from public;
revoke all on function public.criar_agendamento_online(text, uuid, timestamptz, text, text, text) from public;
grant execute on function public.perfil_publico(text) to anon, authenticated;
grant execute on function public.horarios_ocupados(text, timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.criar_agendamento_online(text, uuid, timestamptz, text, text, text) to anon, authenticated;
grant execute on function public.gerar_slug(text) to anon, authenticated;
