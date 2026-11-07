-- =============================================================================
-- 0007_cron_lembretes.sql — agenda a chamada do endpoint de lembretes a cada 5 min
-- Substitua SITE_URL e CRON_SECRET antes de rodar (o valor real fica só no banco
-- e nas variáveis de ambiente; nunca no repositório).
-- =============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove agendamento anterior com o mesmo nome (idempotente)
do $$
begin
  perform cron.unschedule('lembretes-agenda');
exception when others then
  null;
end $$;

select cron.schedule(
  'lembretes-agenda',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'SITE_URL/api/cron/lembretes',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer CRON_SECRET"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- Conferir: select jobid, jobname, schedule, active from cron.job;
-- Histórico:  select * from cron.job_run_details order by start_time desc limit 20;
