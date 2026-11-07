# Vaguinha — CLAUDE.md

SaaS de agenda para profissionais autônomas (ex.: manicure). Nome do produto: **Vaguinha** (domínio vaguinha.app,
definido em 07/11/2026; antes era o provisório "Agenda"). `NOME_APP` em `src/lib/constantes.ts`.
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

## Marca (07/11/2026)

- Cores oficiais: vinho `#702D50`, rosa `#D799AF`, creme `#FCF6F1` (tokens em `globals.css`: `--vinho`, `--rosa`, `--creme`;
  `--primary` = vinho, `--background` = creme). Fonte: Nunito (next/font). Logos em `public/marca/` (horizontal, vertical,
  claras, símbolo); componente `components/marca/LogoVaguinha.tsx` troca para a versão clara no modo escuro.
- Ícones do PWA são gerados da marca: `node scripts/gerar-icones.mjs`.
- Efeitos reutilizáveis em `globals.css`: `.fundo-aurora`, `.gradiente-marca`, `.surgir` (+ `.surgir-atraso-N`),
  `.cartao-vivo`, `.flutuar`, `.brilho`. Todos respeitam `prefers-reduced-motion`. `(app)/template.tsx` anima cada página.

## Planos (07/11/2026)

- `teste` (grátis, tudo liberado), `essencial` R$ 19,90 (perfil, serviços, clientes, agenda),
  `profissional` R$ 29,90 (+ agendamento pela cliente + lembretes), `premium` R$ 39,90 (+ stories).
- Regra única em `src/lib/planos.ts` (`temRecurso(plano, recurso)`); telas travadas usam `components/layout/BloqueioPlano.tsx`.
  Rotas de API também checam (`/api/stories` → 403; cron só envia push para planos com lembretes).
- A barra inferior só reflete o plano após recarregar a página (layout não re-renderiza em navegação entre páginas irmãs).

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
2. ✅ Perfil da profissional (nome, logo, cores, contato, expediente, modelo de lembrete)
3. ✅ Serviços (nome, duração, valor, ativo/inativo, ordem, sugestões iniciais)
4. ✅ Clientes (cadastro, WhatsApp com máscara, observações, busca; histórico e "agendar de novo" ligam no módulo 5)
5. ✅ Agenda (dia/semana/mês; marcar, remarcar, concluir, faltou, cancelar, bloquear; EXCLUDE no banco; histórico da cliente)
6. ✅ Lembretes (push 1 dia/1 h via pg_cron → /api/cron/lembretes; botão wa.me com modelo; lista de pendentes com check)
7. ✅ Gerador de stories 9:16 (`/api/stories/[tipo]` com ImageResponse; templates em `features/stories/templates`)
8. ✅ PWA instalável (manifest, ícones, SW com cache, /offline, aviso "Instale o app") + otimização (getClaims, loading.tsx)

## Como trabalhar

- Um módulo por vez. Ao terminar: `git commit`, e explicar ao Diego como testar.
- Antes de mudanças estruturais (schema, pastas, libs novas), propor e esperar aprovação.
- Migrações em `supabase/migrations/`, numeradas. Nunca editar migração já aplicada; criar nova.
  Ao criar tabela nova, atualizar `src/types/database.ts` à mão.
- Toda tabela de dados da profissional tem `profissional_id` + RLS `auth.uid() = profissional_id`.
  **Sem** cláusula "ou admin" nessas tabelas (migração 0011): o admin só enxerga `profiles`. Com "ou admin", a conta
  admin via os dados de todas as profissionais misturados na própria agenda.
- Nunca usar a `service_role` key no cliente; só em rotas de API server-side.
- Escrita via Server Actions em `features/<modulo>/actions.ts` (zod + `EstadoForm`), leitura em `queries.ts`.
- Textos em pt-BR, simples e diretos. Mobile first (uso no celular). Inputs com `h-11 text-base`.
- Nomes em português: tabelas (`servicos`), pastas, funções (`listarContas`), componentes (`ListaContas`).

## Infra em uso

- Supabase: projeto `supabase-aureolin-car` (ref `bdiefcuoomhtspmktksz`), criado pela integração da Vercel.
  Há um segundo projeto manual sem uso ("diegomns1's Project") que pode ser apagado.
- GitHub: `diegomns1/agenda` (branch `main`). Vercel: projeto `agenda`, deploy automático a cada push.
- Produção: https://agenda-murex-five.vercel.app
- Na Vercel as variáveis vêm da integração com os nomes `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY`;
  o `next.config.ts` mapeia para `NEXT_PUBLIC_*`. Novas variáveis (VAPID, CRON_SECRET) precisam ser
  adicionadas à mão em Vercel → Settings → Environment Variables.
- Supabase Auth: Confirm email desligado; Redirect URLs cadastradas para localhost e produção.
- Storage: bucket público `logos` (migração 0002), arquivo em `{uid}/logo.png|svg`; upload feito pelo navegador
  (`UploadLogo.tsx` redimensiona para 800px) e a URL pública é gravada em `profiles.logo_url` por Server Action.
- Migrações aplicadas em produção: 0001 a 0007 (job `lembretes-agenda`, a cada 5 min). A 0007 foi rodada pelo Diego com os valores reais
  (`supabase/0007_cron_lembretes.PREENCHIDO.local.sql`, git-ignored). Chaves VAPID/CRON_SECRET: `.env.local`
  e `.env.vercel.local` (bloco para colar na Vercel). Nunca imprimir esses valores em comandos.
- Push: `public/sw.js` (push + notificationclick), `components/pwa/RegistroSW.tsx`, `src/lib/push.ts` (web-push,
  importar como `import * as webpush`), `features/lembretes/*`. Cron: `app/api/cron/lembretes/route.ts`
  (Bearer CRON_SECRET, service_role; janela "≤" para 1 dia e 1 h; marca `lembrete_1d/1h_enviado_em`).
- Ícones em `public/icons/` gerados por `node scripts/gerar-icones.mjs` (sharp). Trocar o desenho = editar o SVG no script.
- Domínios: painel em `painel.vaguinha.app`; site institucional no apex `vaguinha.app`, servido pelo MESMO projeto:
  `src/proxy.ts` reescreve `/` do apex para `app/(site)/site/page.tsx`, deixa passar `/termos`, `/privacidade` e `/site/*`
  e redireciona o resto (login, agenda...) para o painel; `www` → apex. `agenda.digstudio.com.br` e
  `agenda-murex-five.vercel.app` redirecionam (308) para o painel. Textos do site ficam em listas no topo do page.tsx;
  preços vêm de `src/lib/planos.ts`. Efeito de aparecer ao rolar: `components/site/Revelar.tsx` + `.revelar` no CSS.
- Sessão: `obterUsuario()` usa `getClaims()` (JWT local). `obterPerfil()` é a única ida ao banco para dados da conta.
- Stories (satori): só `display:flex` em quem tem vários filhos, estilos inline, sem emoji (fonte padrão), logo SVG não
  renderiza (cai na inicial). Temas em `features/stories/temas.ts`; dados em `dados.ts`; rota `app/api/stories/[tipo]/route.tsx`.
  Modo manual (07/11): a tela pré-marca o que a agenda indica (Server Action `sugerirStory`) e a profissional ajusta;
  a prévia é gerada por `POST /api/stories/[tipo]` com JSON `{tema, data, horarios|dias|servicos, foto}` (`selecao.ts`).
  `GET` continua como modo automático. Foto do serviço vai como data URL JPEG (≤1080px) e não é salva.
- Datas civis: `somarDias/somarMeses/diaDaSemana/diasEntre` são aritmética UTC pura. Nunca usar `toZonedTime + addDays`
  para somar dias: em servidor UTC (Vercel) devolve o mesmo dia (bug de 07/11 que esvaziou a visão Dia e os stories).
  Para testar como na Vercel: preview `agenda-dev-utc` (TZ=UTC) ou `cmd /c "set TZ=UTC&& node ..."`.
- MVP (8 módulos) concluído em 07/11/2026. Próximos passos possíveis: cobrança (Asaas/Mercado Pago), agendamento
  público pela cliente (`/p/[slug]`), e-mail de boas-vindas/aprovação, site institucional em vaguinha.app.
- Agenda: `features/agenda/disponibilidade.ts` (horários livres, puro), `GradeHoraria.tsx` (eixo de horas +
  colunas; dia e semana), `VisaoMes.tsx`, `FormAgendamento.tsx` (atendimento/bloqueio; busca horários via
  Server Action `consultarHorarios`), `DetalheAgendamento.tsx` (status). Datas civis "AAAA-MM-DD" em SP:
  helpers em `src/lib/datas.ts` (`instanteEmSP`, `inicioDoDia`, `somarDias`, `diaDaSemana`...).
- `agendamentos.servico_id` é `on delete restrict` (serviço usado vira inativo); `cliente_id` é `set null`
  (histórico sobrevive via `cliente_nome`). Erro 23P01 = conflito de horário.
- Abrir o formulário por URL: `/agenda?novo=atendimento&cliente=<id>&servico=<id>&data=AAAA-MM-DD`.
- Agendamento pela cliente (etapa 3, migração 0010): página `app/p/[slug]/page.tsx` (sem login) usa só RPCs
  `security definer` (`perfil_publico`, `horarios_ocupados`, `criar_agendamento_online`) via cliente anon
  (`features/online/publico.ts`); toda validação de negócio fica na função SQL (expediente, grade, antecedência,
  limite de 3 futuros por telefone, conflito via EXCLUDE). Status `pendente` = aguardando confirmação (reserva o horário).
  Configuração no Perfil: `slug`, `agendamento_online`, `confirmacao_online`, `antecedencia_min_horas`.
  Regra de plano duplicada em SQL em `plano_tem_agendamento_online()` — manter em sincronia com `src/lib/planos.ts`.
- Formulário com Switch/Checkbox do Radix que continua na tela após salvar (ex.: Perfil): enviar por `onSubmit` +
  `startTransition(() => acao(formData))` e usar o 3º retorno de `useActionState` no botão. Com `action={acao}` o
  React 19 reseta o form depois da ação e o Radix devolve o Switch ao valor inicial da página (bug visto em 07/11).
- E-mails do app (etapa 4): `src/lib/email.ts` (Resend via fetch; sem `RESEND_API_KEY`/`EMAIL_REMETENTE` não envia e
  não quebra nada), modelos em `features/emails/modelos.ts` (HTML em tabela, textos escapados). Disparos: cadastro
  (`auth/actions.ts`), aprovação/recusa/suspensão (`admin/actions.ts`), vencimento em 3 dias (cron de lembretes,
  marca `aviso_vencimento_para`). Termos/privacidade em `app/(legal)/*`; versão e contato em `src/lib/legal.ts`;
  aceite gravado pelo trigger `handle_new_user` (migração 0012) a partir do metadata do signUp.
  Modelos do Supabase Auth em pt-BR: `supabase/email-templates/` (colar no painel; não é código).
- Funções puras compartilhadas entre servidor e cliente ficam em `src/lib/*` (nunca exportar de um arquivo "use client":
  o servidor não consegue chamá-las e a página quebra com erro 500 — já aconteceu duas vezes).
- Padrão de lista + diálogo (criar/editar) + menu de opções + confirmação de exclusão: ver `features/servicos/components/ListaServicos.tsx`.
  Dinheiro: `src/lib/moeda.ts` (`interpretarMoeda` aceita "1.250,50", "45,5", "45.50").
- Nesta máquina, `git push` e SQL de concessão de admin são executados pelo Diego (permissão da sessão).

## Ambiente local

- Código em `C:\claude\agenda-saas` (G: do Google Drive é lento para `node_modules`).
  Documentação/proposta também em `G:\...\claude\Plataforma de agendamento de serviços\`.
- Git em `C:\Program Files\Git\cmd\git.exe` (pode não estar no PATH de shells antigos).
- Node 24 / npm 11. Sem CLI do Supabase: migrações rodam no SQL Editor do painel.
- `.env.local` a partir de `.env.example`.
