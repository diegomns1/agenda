-- =============================================================================
-- 0002_storage_logos.sql — bucket público "logos" para a logo da profissional
-- Caminho do arquivo: {auth.uid()}/logo.<ext>  (cada profissional só mexe na própria pasta)
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos',
  'logos',
  true,
  2097152, -- 2 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Leitura pública (a logo aparece nos stories e no app)
create policy "logos: leitura pública"
  on storage.objects for select
  using (bucket_id = 'logos');

-- Escrita só na própria pasta
create policy "logos: dona envia"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "logos: dona atualiza"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "logos: dona apaga"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
