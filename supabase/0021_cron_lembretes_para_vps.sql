-- Leva o agendador de lembretes da Vercel para a VPS (09/11/2026).
-- Troca só o endereço; a senha (CRON_SECRET) que já está no comando continua a mesma e não aparece.
select cron.alter_job(
  job_id  := jobid,
  command := replace(command, 'https://agenda-murex-five.vercel.app', 'https://painel.vaguinha.app')
)
from cron.job
where jobname = 'lembretes-agenda';

-- Conferir (mostra só o endereço, nunca a senha):
select jobname, schedule, active, substring(command from 'https?://[^/'']+') as endereco
from cron.job;
