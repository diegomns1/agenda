# Agenda SaaS — CLAUDE.md

SaaS de agenda para profissionais autônomas (ex.: manicure). Nome provisório: **Agenda** (a definir).
Dono do projeto: Diego. Responder sempre em **português do Brasil**.

## Stack (não mudar sem aprovação)

- Next.js 16 (App Router, `src/proxy.ts` no lugar de middleware) + TypeScript + Tailwind 4
- `cacheComponents` DESLIGADO de propósito (renderização dinâmica clássica; auth por cookies)
- Componentes: shadcn/ui estilo `radix-nova` (`npx shadcn@latest add <componente>`), lucide-react, sonner
- Supabase: Auth (e-mail + senha), Postgres com RLS, Storage (bucket `logos`)
- Cliente Supabase via `@supabase/ssr`: `criarClienteServidor()` (RSC/actions), `criarClienteNavegador()`,
  `criarClienteAdmin()` (service_role, só rotas de API)
- Validação: zod 4 (`z.flattenError`); formulários simples com `useActionState` + Server Actions
- Datas: date-fns + date-fns-tz. Banco guarda `timestamptz`; UI sempre em `America/Sao_Paulo` (`src/lib/datas.ts`)
- PWA: `public/manifest.webmanifest` + `public/sw.js` escrito à mão (push + cache do shell)
- Web Push: biblioteca `web-push` (VAPID) em rotas de API do Next
- Stories 9:16: `ImageResponse` (satori) em rota de API → PNG 1080x1920. **Sem IA.**
- Deploy: Vercel. Cron: `pg_cron` + `pg_net` no Supabase chamando `/api/cron/lembretes` com `CRON_SECRET`
  (o plano Hobby da Vercel só permite cron 1x/dia, insuficiente para lembrete de 1h)

## Decisões de produto

- Fase de testes gratuita. Cadastro nasce com `status = 'pendente'`; só o admin aprova/recusa/suspende.
- Admin = usuário com `app_metadata.role = 'admin'` no JWT (SQL em `supabase/migrations/0001_base.sql`).
- `plano` e `ativa_ate` controlam pagamento manual via Pix. Asaas/Mercado Pago é futuro.
- **Sem API do WhatsApp.** Lembretes: push para a profissional 1 dia e 1 h antes; botão "Lembrar cliente"
  abre `wa.me` com mensagem do `modelo_lembrete` (`{nome}`, `{dia}`, `{hora}`, `{servico}`);
  lista de pendentes com check (`cliente_avisada_em`).
- Agenda sem conflito garantido no banco por `EXCLUDE` (btree_gist) sobre `tstzrange(inicio, fim)`,
  cobrindo atendimentos **e** bloqueios (mesma tabela `agendamentos`, coluna `tipo`).
- Stories nunca mostram nome de cliente. Temas: neutro, Natal, Ano Novo, Dia da Mulher, Outubro Rosa, Novembro Azul.
- A cliente final NÃO tem login no MVP.

## Módulos do MVP

1. ✅ Login, cadastro e aprovação pelo admin
2. ⬜ Perfil da profissional (nome, logo, cores, contato, expediente)
3. ⬜ Serviços (nome, duração, valor)
4. ⬜ Clientes (cadastro, telefone, observações, histórico, "agendar de novo")
5. ⬜ Agenda (dia/semana/mês; marcar, remarcar, cancelar, bloquear; sem conflito)
6. ⬜ Lembretes (push + wa.me + lista de pendentes)
7. ⬜ Gerador de stories 9:16
8. ⬜ PWA instalável com aviso "Instale o app para receber lembretes"

## Como trabalhar

- Um módulo por vez. Ao terminar: `git commit`, e explicar ao Diego como testar.
- Antes de mudanças estruturais (schema, pastas, libs novas), propor e esperar aprovação.
- Migrações em `supabase/migrations/`, numeradas. Nunca editar migração já aplicada; criar nova.
  Ao criar tabela nova, atualizar `src/types/database.ts` à mão.
- Toda tabela de dados da profissional tem `profissional_id` + RLS `auth.uid() = profissional_id`,
  mais policy de admin via `public.is_admin()`.
- Nunca usar a `service_role` key no cliente; só em rotas de API server-side.
- Escrita via Server Actions em `features/<modulo>/actions.ts` (zod + `EstadoForm`), leitura em `queries.ts`.
- Textos em pt-BR, simples e diretos. Mobile first (uso no celular). Inputs com `h-11 text-base`.
- Nomes em português: tabelas (`servicos`), pastas, funções (`listarContas`), componentes (`ListaContas`).

## Ambiente local

- Código em `C:\claude\agenda-saas` (G: do Google Drive é lento para `node_modules`).
  Documentação/proposta também em `G:\...\claude\Plataforma de agendamento de serviços\`.
- Git em `C:\Program Files\Git\cmd\git.exe` (pode não estar no PATH de shells antigos).
- Node 24 / npm 11. Sem CLI do Supabase: migrações rodam no SQL Editor do painel.
- `.env.local` a partir de `.env.example`.
