-- =============================================================================
-- 0006_push_subscriptions.sql — inscrições de Web Push da profissional
-- (um registro por aparelho/navegador)
-- =============================================================================

create table public.push_subscriptions (
  id               uuid primary key default gen_random_uuid(),
  profissional_id  uuid not null references public.profiles(id) on delete cascade,
  endpoint         text not null unique,
  p256dh           text not null,
  auth             text not null,
  user_agent       text,
  created_at       timestamptz not null default now(),
  ultimo_uso_em    timestamptz
);

comment on table public.push_subscriptions is 'Inscrições Web Push. Endpoint que responder 404/410 é removido pelo servidor.';

create index push_subscriptions_profissional_idx on public.push_subscriptions (profissional_id);

alter table public.push_subscriptions enable row level security;

create policy "push: ver as próprias"
  on public.push_subscriptions for select
  to authenticated
  using (auth.uid() = profissional_id);

create policy "push: criar as próprias"
  on public.push_subscriptions for insert
  to authenticated
  with check (auth.uid() = profissional_id);

create policy "push: editar as próprias"
  on public.push_subscriptions for update
  to authenticated
  using (auth.uid() = profissional_id)
  with check (auth.uid() = profissional_id);

create policy "push: apagar as próprias"
  on public.push_subscriptions for delete
  to authenticated
  using (auth.uid() = profissional_id);

-- O cron (service_role) lê todas: service_role ignora RLS, não precisa de policy.
