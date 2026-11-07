-- =============================================================================
-- 0011_rls_sem_admin_nos_dados.sql
-- O admin só precisa enxergar `profiles` (aprovar contas, planos). As policies
-- "ou admin" em servicos/clientes/agendamentos faziam a conta admin ver os
-- dados de TODAS as profissionais misturados na própria agenda (bug visto em
-- 07/11/2026). Aqui elas passam a valer só para a dona dos dados.
-- =============================================================================

-- servicos --------------------------------------------------------------------
drop policy if exists "servicos: ver os próprios ou admin"    on public.servicos;
drop policy if exists "servicos: editar os próprios ou admin" on public.servicos;
drop policy if exists "servicos: apagar os próprios ou admin" on public.servicos;

create policy "servicos: ver os próprios"
  on public.servicos for select to authenticated
  using (auth.uid() = profissional_id);

create policy "servicos: editar os próprios"
  on public.servicos for update to authenticated
  using (auth.uid() = profissional_id)
  with check (auth.uid() = profissional_id);

create policy "servicos: apagar os próprios"
  on public.servicos for delete to authenticated
  using (auth.uid() = profissional_id);

-- clientes --------------------------------------------------------------------
drop policy if exists "clientes: ver as próprias ou admin"    on public.clientes;
drop policy if exists "clientes: editar as próprias ou admin" on public.clientes;
drop policy if exists "clientes: apagar as próprias ou admin" on public.clientes;

create policy "clientes: ver as próprias"
  on public.clientes for select to authenticated
  using (auth.uid() = profissional_id);

create policy "clientes: editar as próprias"
  on public.clientes for update to authenticated
  using (auth.uid() = profissional_id)
  with check (auth.uid() = profissional_id);

create policy "clientes: apagar as próprias"
  on public.clientes for delete to authenticated
  using (auth.uid() = profissional_id);

-- agendamentos ----------------------------------------------------------------
drop policy if exists "agendamentos: ver os próprios ou admin"    on public.agendamentos;
drop policy if exists "agendamentos: editar os próprios ou admin" on public.agendamentos;
drop policy if exists "agendamentos: apagar os próprios ou admin" on public.agendamentos;

create policy "agendamentos: ver os próprios"
  on public.agendamentos for select to authenticated
  using (auth.uid() = profissional_id);

create policy "agendamentos: editar os próprios"
  on public.agendamentos for update to authenticated
  using (auth.uid() = profissional_id)
  with check (auth.uid() = profissional_id);

create policy "agendamentos: apagar os próprios"
  on public.agendamentos for delete to authenticated
  using (auth.uid() = profissional_id);
