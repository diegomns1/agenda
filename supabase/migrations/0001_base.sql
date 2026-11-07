-- =============================================================================
-- 0001_base.sql — base do sistema: perfis das profissionais, RLS e admin
-- Rodar no SQL Editor do Supabase (ou via `supabase db push`).
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Função: é admin? (lê o claim app_metadata.role do JWT)
-- Para tornar alguém admin:
--   update auth.users
--      set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'
--    where email = 'seu@email.com';
-- A pessoa precisa sair e entrar de novo para o JWT ser renovado.
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- -----------------------------------------------------------------------------
-- Função genérica: atualiza updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Tabela: profiles (1:1 com auth.users) — a profissional
-- -----------------------------------------------------------------------------
create table public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  email               text,
  nome                text not null,
  nome_negocio        text,
  telefone            text,                      -- só dígitos, com DDI: 5511999999999
  instagram           text,                      -- sem @
  logo_url            text,
  cor_primaria        text not null default '#C2185B',
  cor_secundaria      text not null default '#FCE4EC',

  status              text not null default 'pendente'
                      check (status in ('pendente', 'aprovada', 'recusada', 'suspensa')),
  status_motivo       text,
  status_alterado_em  timestamptz,

  plano               text not null default 'teste'
                      check (plano in ('teste', 'mensal', 'trimestral', 'anual')),
  ativa_ate           date,                      -- null = sem limite (fase de testes)

  expediente          jsonb not null default '{
    "0": {"ativo": false, "inicio": "08:00", "fim": "18:00"},
    "1": {"ativo": true,  "inicio": "08:00", "fim": "18:00"},
    "2": {"ativo": true,  "inicio": "08:00", "fim": "18:00"},
    "3": {"ativo": true,  "inicio": "08:00", "fim": "18:00"},
    "4": {"ativo": true,  "inicio": "08:00", "fim": "18:00"},
    "5": {"ativo": true,  "inicio": "08:00", "fim": "18:00"},
    "6": {"ativo": true,  "inicio": "08:00", "fim": "13:00"}
  }'::jsonb,
  intervalo_grade_min int  not null default 30 check (intervalo_grade_min in (15, 20, 30, 60)),
  modelo_lembrete     text not null default 'Oi {nome}! Passando para lembrar do seu horário de {servico} {dia} às {hora}. Te espero! 💅',

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.profiles is 'Perfil da profissional (1:1 com auth.users). status/plano/ativa_ate só o admin altera.';

create index profiles_status_idx on public.profiles (status, created_at desc);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Trigger: campos que só o admin (ou a service_role) pode mudar
-- -----------------------------------------------------------------------------
create or replace function public.profiles_protege_campos_admin()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' or public.is_admin() then
    if new.status is distinct from old.status then
      new.status_alterado_em = now();
    end if;
    return new;
  end if;

  if new.status        is distinct from old.status
  or new.status_motivo is distinct from old.status_motivo
  or new.plano         is distinct from old.plano
  or new.ativa_ate     is distinct from old.ativa_ate
  or new.email         is distinct from old.email
  or new.id            is distinct from old.id then
    raise exception 'Somente o administrador pode alterar status, plano e validade da conta'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger profiles_protege_campos_admin
  before update on public.profiles
  for each row execute function public.profiles_protege_campos_admin();

-- -----------------------------------------------------------------------------
-- Trigger: cria o perfil quando um usuário se cadastra
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, nome, telefone)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)),
    nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'telefone', ''), '\D', '', 'g'), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles: ver o próprio ou admin"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or public.is_admin());

create policy "profiles: editar o próprio ou admin"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- Sem policy de insert/delete: o insert vem do trigger (security definer)
-- e a exclusão acontece em cascata ao apagar o usuário em auth.users.
