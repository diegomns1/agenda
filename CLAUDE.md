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

- `teste` (grátis por `DIAS_TESTE` = 3 dias, contados da aprovação, com os recursos do Essencial: `nivel` 1;
  a validade é gravada em `alterarStatusConta` na primeira aprovação; migração 0014 tirou o teste do agendamento online),
  `essencial` R$ 29,90 (perfil, serviços, clientes, agenda),
  `profissional` R$ 39,90 (+ agendamento pela cliente + lembretes), `premium` R$ 59,90 (+ stories, relatórios,
  assistente de IA; "Mais escolhido" no site e na assinatura). Preços só em `src/lib/planos.ts` (08/11/2026).
- Regra única em `src/lib/planos.ts` (`temRecurso(plano, recurso)`); telas travadas usam `components/layout/BloqueioPlano.tsx`.
  Rotas de API também checam (`/api/stories` → 403; cron só envia push para planos com lembretes).
- A barra inferior só reflete o plano após recarregar a página (layout não re-renderiza em navegação entre páginas irmãs).

## Decisões de produto

- Fase de testes gratuita. Cadastro nasce com `status = 'pendente'`. **Desde 11/11/2026 o teste é liberado sozinho**
  (`features/auth/aprovacao.ts`): na 1ª entrada (e-mail já confirmado), /aguardando-aprovacao aprova com service_role
  a conta pendente + plano teste + sem validade, grava `ativa_ate` = hoje + DIAS_TESTE, manda StartTrial e o e-mail de
  boas-vindas. O admin continua recusando/suspendendo. `APROVACAO_MANUAL=1` no env da VPS volta ao modo manual (reload).
- Admin = usuário com `app_metadata.role = 'admin'` no JWT (SQL em `supabase/migrations/0001_base.sql`).
- `plano` e `ativa_ate` controlam pagamento manual via Pix. Asaas/Mercado Pago é futuro.
- **WhatsApp para as clientes finais: sem API** (decisão mantida). Lembretes: push para a profissional 1 dia e 1 h antes; botão "Lembrar cliente"
  abre `wa.me` com mensagem do `modelo_lembrete` (`{nome}`, `{dia}`, `{hora}`, `{servico}`);
  lista de pendentes com check (`cliente_avisada_em`).
- **Assistente no WhatsApp (API oficial da Meta, só para a profissional; decisão de 09/11/2026, plano em
  PLANO-ASSISTENTE-WHATSAPP.md na pasta do Drive).** Webhook `app/api/webhooks/whatsapp` (assinatura
  X-Hub-Signature-256 com WHATSAPP_APP_SECRET; responde 200 e trata depois com `after`). `features/whatsapp/`:
  `meta.ts` (envio; sem WHATSAPP_TOKEN só loga "[whatsapp simulado]"), `processar.ts` (conectar por código
  "Conectar Vaguinha código XXXX-XXXX" de 8 caracteres e 15 min, gerado no Perfil; botões sim:/nao:<id>; "sim"/"não"
  respondem a última proposta pendente; histórico de 24 h), migração 0019 (tabelas whatsapp_* só com service_role).
  O "cérebro" é o mesmo do app: `features/assistente/nucleo.ts` (`processarMensagem`, `aplicarProposta`).
  Sem sessão de navegador, os dados da profissional são lidos com `lib/supabase/escopado.ts`
  (`clienteDaProfissional`: força profissional_id em todo select/update/delete/insert; só tabelas de negócio).
  NUNCA usar o cliente admin direto em código da assistente. Quadro "Assistente no WhatsApp" no Perfil só aparece
  com WHATSAPP_NUMERO_ASSISTENTE e, sem WHATSAPP_ABERTO=1, só para admin (`numero.ts`, lidos na hora: basta reload).
  Variáveis na VPS: `ssh -t root@179.198.107.151 bash /root/vaguinha/definir-whatsapp.sh` (deploy/vps/).
  No ar desde 10/11/2026 no número (14) 99802-3550 (WHATSAPP_ABERTO=1). WhatsApp é o caminho principal:
  `features/whatsapp/estado.ts` decide o botão fixo, o cartão da tela inicial e o aviso na tela Assistente
  (conectada → wa.me da Vaguinha; Premium sem conexão → /perfil#whatsapp; resto → /assistente). O chat do painel
  ficou como reserva ("Assistente no painel" no menu); só remover depois do áudio (Fase 2) e olhando o uso.
- **Anúncios da Meta (11/11/2026).** Pixel "Vaguinha Site" 2307852893116834 (BM Vaguinha App, conta Vaguinha CA),
  domínio vaguinha.app verificado por meta tag (`features/rastreio/comum.ts`). `RastreioMeta` (site, telas públicas e
  legais; nunca no painel): aviso de cookies (vg_consent em .vaguinha.app) e pixel só depois do "Aceitar"; guarda utm_* e
  fbclid no cookie vg_origem. `rastreio/servidor.ts` (API de Conversões, META_CAPI_TOKEN): Lead no cadastro (mesmo
  evento_id do navegador), StartTrial quando a conta é liberada (automático: confirmou o e-mail e entrou), Subscribe no 1º pagamento (Asaas);
  uma vez cada (profiles.eventos_meta) e só com consentimento (profiles.origem_anuncio, migração 0021). Funil por
  campanha/anúncio no Painel do dono. Chave na VPS: `ssh -t root@179.198.107.151 bash /root/vaguinha/definir-meta.sh`.
- **Central do WhatsApp (11/11/2026, PLANO-CENTRAL-WHATSAPP.md no Drive).** O (14) 99802-3550 é o WhatsApp oficial:
  a IA responde tudo. `processar.ts` guarda cada pessoa em `whatsapp_contatos` (card: etapa robo/link/cadastrou/assinou/
  sem_resposta + atendimento robo/precisa/humano) e cada mensagem em `whatsapp_mensagens` (migração 0020). Roteia:
  conectada Premium → assistente (`nucleo`, com `chamar_equipe` e a base de conhecimento); número igual ao do cadastro →
  `atendimento.ts` modo suporte; resto → modo vendas (lead). `conhecimento.ts` = o que a IA pode afirmar (preços de
  planos.ts). chamar_equipe → atendimento "precisa" + e-mail para EMAIL_ADMIN. "humano" = Diego assumiu, robô quieto.
  Limite de IA: 40 mensagens/dia por contato que não é cliente.
  Tela `/admin/whatsapp` (aba WhatsApp do admin, com contador de "precisa"): `central.ts` (ações só admin) +
  `components/CentralWhatsApp` (kanban: Precisa de você, Com você, Robô, Link, Cadastrou, Assinou, Sem resposta;
  filtro Todos/Leads/Clientes; arrastar no computador; atualiza a cada 10 s) + `ConversaWhatsApp` (Assumir, Devolver ao
  robô, Mover, Responder). Responder pela Central põe o card em "humano" (o robô sai). Janela da Meta: 24 h
  (72 h se veio de anúncio). Lead parado há 3 dias vira "sem resposta" ao abrir a Central. `?c=<telefone>` abre a conversa. Fase 2 (áudio) e 3 (avisos automáticos) ainda não feitas.
- Agenda sem conflito garantido no banco por `EXCLUDE` (btree_gist) sobre `tstzrange(inicio, fim)`,
  cobrindo atendimentos **e** bloqueios (mesma tabela `agendamentos`, coluna `tipo`).
- /agenda abre no mês (estilo Google: "8h Nome"); dia/semana com rolagem própria (`GradeHoraria`, overscroll-contain).
  Feriados e datas comemorativas calculados em `src/lib/feriados.ts` (sem API).
  Semana no celular (<640px) é `SemanaLista` (lista dia a dia com horários livres); a grade só aparece de sm para cima.
- Cores/ícones de situação SÓ em `features/agenda/visual.ts` (mês, semana, dia, detalhe, histórico, legenda).
- Celular primeiro: alvos de toque ≥44px (h-11 / size-11 no mobile), texto ≥11px, janelas (Dialog) viram gaveta
  de baixo no mobile. `position: fixed` dentro de página precisa de `<Flutuante>` (portal no body: a animação
  .surgir usa transform e prenderia o fixed). O tema (data-tema) é copiado para o body por `<AplicarTema>`.
- Crítica de design (Impeccable) em `.impeccable/critique/`.
- **Sistema de design: ler `DESIGN.md` antes de mexer em tela.** Tokens em `globals.css` (bg-concluido,
  text-aviso-texto, text-mini, h-toque, shadow-media…). Nada de `bg-amber-*`, `text-[10px]`, `shadow-vinho/20`
  soltos no painel.
- Movimento da agenda (GSAP) em `features/agenda/movimento.tsx`: links de período usam `LinkAgenda`; o salvo é
  destacado por `data-agendamento`; as actions de salvar devolvem `valores.id`. Ver seção Movimento do DESIGN.md.
- Assistente (Premium): IA = claude-haiku-5-5 (`lib/anthropic.ts`). ANTES da IA, `features/assistente/comandos.ts`
  responde sem custo os pedidos de consulta que `interpretar.ts` reconhece (agenda de um dia/semana, horários livres,
  próximo cliente, quanto entrou). Pedido de mudança ou com nome de cliente vai sempre para a IA. "sim"/"não" para uma
  proposta pendente é resolvido na tela. Voz: `useVoz.ts` só OUVE (SpeechRecognition do navegador, grátis); a
  assistente responde só por escrito (Diego, 09/11/2026). O microfone some onde não há suporte (Firefox).
  Dia/hora: `pistasDaFrase` (interpretar.ts) lê dia e horário SEM IA ("sexta às 11h" → 2026-11-13, 11:00; número depois
  de às/h ou logo depois do dia é hora) e vai junto da mensagem como "[Leitura automática da frase: ...]"; o contexto
  traz um calendário de 14 dias. Effort "high". Botão fixo `BotaoAssistente` em todas as telas do painel.
  Clientes: `propor_cadastrar_cliente` / `propor_editar_cliente` (09/11/2026). Mesmo WhatsApp (com ou sem o 9) bloqueia;
  nome parecido só avisa (a IA conta e a profissional decide no Confirmar). `propor_marcar` com cadastro novo também
  recusa WhatsApp repetido.
  Testar frases novas com um script tsx chamando `interpretar` / `pistasDaFrase`.
- Mensagens do WhatsApp (sugestão da Layara, 09/11/2026): `features/mensagens/modelos.ts` (5 situações: lembrete,
  confirmacao, remarcacao, cancelamento, agradecimento; campos {nome} {nome_completo} {dia} {data} {hora} {servico} {valor}
  {duracao} {endereco} {negocio} {link}, aceitos também com acento; linha com campo vazio some). Textos em
  `profiles.modelos_mensagem` (jsonb; texto igual ao padrão não é guardado) + `profiles.endereco` (migração 0018);
  `modelo_lembrete` continua sendo gravado com o lembrete (compatibilidade). Editor em /mensagens; envio pelo
  `MenuMensagens` no detalhe do atendimento e pelo `BotaoLembrarCliente` na lista de Lembretes.
- Site público (`app/(site)/site`): ver seção "Site público" do DESIGN.md. E-mails têm `previa` (linha ao lado do
  assunto na caixa de entrada); o de conta aprovada leva direto para /servicos.
- Importar do Google Agenda em /agenda/importar: .zip/.ics lido no navegador (`features/importar/ical.ts`, ical.js +
  fflate; testável com `node` direto, sem imports "@/"); a action insere em lotes e o EXCLUDE recusa conflitos.
- Stories nunca mostram nome de cliente. 16 temas (grupos "sempre" e "datas") em `features/stories/temas.ts`; os com
  `imagem: true` usam papel de parede em `public/stories/temas/<id>.jpg` (+ `<id>-mini.jpg`), gerados no Higgsfield
  (script `scripts/baixar-fundos-stories.mjs`). A rota baixa o .jpg e passa como data URL (satori recusa localhost).
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
- **PRODUÇÃO NA VPS desde 08/11/2026** (Hostinger 179.198.107.151, junto com outros sistemas do Diego). Tudo em
  `deploy/vps/` (cópias em `/root/vaguinha/`): PM2 "vaguinha" (`next start -p 3020 -H localhost` → escuta em [::1];
  com 127.0.0.1 o rewrite do site quebra com 500 EPROTO), nginx `sites-available/vaguinha` (painel + www + apex→www,
  HTTPS do certbot "vaguinha"), publicação `atualizar.sh` (cada versão em `releases/`, troca o atalho `atual` só
  depois do build; guarda 3), variáveis em `/root/vaguinha/config/env` (gravadas por `trazer-variaveis.ps1` no PC do
  Diego; `$` vai como `\$` porque o Next expande). Tarefas (instaladas pelo Diego com `instalar-tarefas.sh`):
  `verificar-atualizacao.sh` a cada 5 min publica push novo da main; `backup-banco.mjs` às 3h BRT (API do Supabase com
  service role → `backups/AAAA-MM-DD.json.gz`, 14 dias). Um build usa a CPU toda por ~4 min.
- GitHub: `diegomns1/agenda` (branch `main`). Vercel (projeto `agenda`) ficou como reserva até tirar os domínios de lá.
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
  e redireciona o resto (login, agenda...) para o painel. `www` e apex servem o site igualmente; o redirecionamento
  entre eles é feito no nginx da VPS (apex → www, 301). Nunca redirecionar www → apex no proxy (laço). `agenda.digstudio.com.br` e
  `agenda-murex-five.vercel.app` redirecionam (308) para o painel. Textos do site ficam em listas no topo do page.tsx;
  preços vêm de `src/lib/planos.ts`. (O efeito de aparecer ao rolar foi removido na etapa 5.)
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
- Cobrança (etapa 5, migração 0013): Asaas via fetch em `src/lib/asaas.ts` (sem `ASAAS_API_KEY` a página mostra
  "em breve"). Fluxo em `features/assinatura/actions.ts`: cliente Asaas (1 por profissional, `externalReference` = uid)
  → assinatura MONTHLY `billingType UNDEFINED` (`externalReference` = `uid:plano`) → abre `invoiceUrl`. Webhook
  `app/api/webhooks/asaas/route.ts` (header `asaas-access-token` = `ASAAS_WEBHOOK_TOKEN`, service_role) espelha em
  `cobrancas` e, uma vez por cobrança paga, aplica `plano` e `ativa_ate = novaValidade()` (1 mês + 3 dias). Página
  `/assinatura` fica no grupo `(conta)`: exige login, não exige validade (é onde a vencida renova). Regras puras em
  `features/assinatura/regras.ts` (CPF/CNPJ, status). Admin manual (plano + ativa_ate) continua valendo.
- Relatórios (Premium, recurso `relatorios`): histórico em `agendamento_eventos`, gravado SÓ pelo trigger
  `registrar_evento_agendamento` (migração 0015) — nunca inserir eventos pelo app. Cálculo em
  `features/relatorios/dados.ts` (faturamento = atendimentos já passados com status agendado/concluído), aviso
  "vagou um horário" em `features/relatorios/vagas.ts` (eventos remarcado/cancelado/excluido com horário antigo no
  futuro e ainda livre). Gráficos: `components/graficos/Colunas.tsx` (uma cor, ênfase + tabela) — ver skill dataviz.
- Ramo, tratamento e tema (migração 0016): catálogo em `src/lib/ramos.ts` (ramos, sinônimos de busca, termo
  atendimento/sessão/aula/consulta/horário, sugestões de serviço, temas). `data-tema` no layout `(app)`/`(conta)`
  troca as variáveis de cor (`[data-tema=...]` em globals.css); nada de cor da marca fixa em CSS (usar var/color-mix).
  `termosDoRamo()` para textos de "atendimento". Ainda há muito "a cliente" (feminino) espalhado: revisão pendente.
- Painel do dono: `/admin/painel` (`features/admin/painel.ts`, service_role com fallback sem ela).
- Suporte: `SUPORTE_WHATSAPP` em constantes (env `NEXT_PUBLIC_SUPORTE_WHATSAPP` ou o número do Diego).
- Service worker não faz cache em localhost (em dev os arquivos mudam sem trocar de nome). Subir `VERSAO` no sw.js
  quando mudar algo de cache.
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
