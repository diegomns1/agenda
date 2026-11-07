-- =============================================================================
-- 0003_servicos.sql — serviços oferecidos pela profissional
-- =============================================================================

create table public.servicos (
  id               uuid primary key default gen_random_uuid(),
  profissional_id  uuid not null references public.profiles(id) on delete cascade,
  nome             text not null check (char_length(nome) between 1 and 80),
  duracao_min      int  not null check (duracao_min between 5 and 600),
  valor            numeric(10,2) not null default 0 check (valor >= 0),
  ativo            boolean not null default true,
  ordem            int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.servicos is 'Serviços da profissional. Com histórico, o serviço vira ativo=false em vez de ser apagado.';

create index servicos_profissional_idx on public.servicos (profissional_id, ativo, ordem);

create trigger servicos_set_updated_at
  before update on public.servicos
  for each row execute function public.set_updated_at();

alter table public.servicos enable row level security;

create policy "servicos: ver os próprios ou admin"
  on public.servicos for select
  to authenticated
  using (auth.uid() = profissional_id or public.is_admin());

create policy "servicos: criar os próprios"
  on public.servicos for insert
  to authenticated
  with check (auth.uid() = profissional_id);

create policy "servicos: editar os próprios ou admin"
  on public.servicos for update
  to authenticated
  using (auth.uid() = profissional_id or public.is_admin())
  with check (auth.uid() = profissional_id or public.is_admin());

create policy "servicos: apagar os próprios ou admin"
  on public.servicos for delete
  to authenticated
  using (auth.uid() = profissional_id or public.is_admin());
