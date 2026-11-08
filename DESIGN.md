# Vaguinha — sistema de design do painel

Fonte única dos valores: `src/app/globals.css` (variáveis CSS) e `@theme inline` (classes do Tailwind).
Este arquivo explica **o que usar e quando**. Atualizado em 08/11/2026 (etapa 2 do plano de design).

## Quem usa e onde

Autônomas e autônomos de beleza e saúde (manicure, barbeiro, lash, personal, nutricionista), **no celular**,
com uma mão, entre um atendimento e outro, muitas vezes com pressa. Modo da interface: **Operar** (tarefa
rápida, leitura de relance). A marca aparece nos detalhes; o resto é clareza.

## Marca (não mudar sem decisão do Diego)

| papel | valor | onde |
|---|---|---|
| vinho (principal) | `#702D50` | `--vinho`, `--primary` no tema rosa |
| rosa (apoio) | `#D799AF` | `--rosa`, anéis de foco, seleção |
| creme (fundo) | `#FCF6F1` | `--creme`, `--background` |
| tinta (texto) | `#2B1620` | `--foreground` |
| fonte | Nunito | `--font-sans` |

Temas do painel (Perfil → "cara do painel"): **rosa** (padrão), **grafite**, **azul**, **verde**, **lavanda**.
Cada tema troca só os semânticos de marca (`--primary`, `--muted`, `--border`…) em `[data-tema=…]`.
O tema é aplicado no layout **e** no `<body>` (`AplicarTema`), para janelas e menus também seguirem.

## Camadas de tokens

1. **Primitivos** (valores crus, nunca direto em componente): `--ambar-*`, `--esmeralda-*`, `--rubi-*`,
   `--ceu-*`, `--verde-whatsapp`, `--duracao-*`, `--curva-*`.
2. **Semânticos** (o que significa; é o que os componentes usam):
   - marca/tema: `--primary`, `--secondary`, `--muted`, `--accent`, `--border`, `--ring`, `--destructive`…
   - situações da agenda: `--pendente-*`, `--concluido-*`, `--faltou-*` (fundo/texto/borda)
   - datas: `--feriado-*` (cheio), `--comemorativa-*` (contorno)
   - mensagens: `--aviso-*`, `--sucesso-*` (fundo/texto/borda/forte), `--whatsapp`
   - profundidade: `--sombra-suave`, `--sombra-media`, `--sombra-alta` (levam a cor do tema)
3. **Componentes**: `--alvo-toque` (44px), `--chip-raio`, `--gaveta-raio`.

**Cores de situação não mudam com o tema**: concluído é sempre verde, faltou sempre rosa-avermelhado,
aguardando sempre âmbar tracejado, feriado sempre azul. "Agendado" é a cor do tema, cheia.

## Classes do Tailwind (use estas)

| precisa de… | use | não use |
|---|---|---|
| situação na agenda | `visualDe(a)` / `VISUAL_STATUS` em `features/agenda/visual.ts` | classes de cor soltas |
| concluído | `bg-concluido text-concluido-texto border-concluido-borda` | `bg-emerald-50 text-emerald-900` |
| aguardando | `bg-pendente text-pendente-texto border-pendente-borda` (tracejado) | `bg-amber-*` |
| faltou | `bg-faltou text-faltou-texto border-faltou-borda` | `bg-rose-*` |
| feriado / data | `bg-feriado text-feriado-texto` / `bg-comemorativa text-comemorativa-texto border-comemorativa-borda` | `bg-sky-*`, `bg-emerald-600` |
| caixa de aviso | `bg-aviso text-aviso-texto border-aviso-borda/60` (ícone: `text-aviso-forte`) | `bg-amber-50` |
| caixa de sucesso | `bg-sucesso text-sucesso-texto border-sucesso-borda` (ícone: `text-sucesso-forte`) | `bg-emerald-50` |
| erro | `text-destructive`, `bg-destructive/10` | `text-red-*` |
| ícone do WhatsApp | `IconeWhatsApp` + `text-whatsapp` | `MessageCircleIcon text-emerald-600` |
| texto pequeno | `text-mini` (11px, o **mínimo** do painel) | `text-[10px]`, `text-[11px]` |
| nome no topo / itens de menu | `text-destaque` (15px) | `text-[15px]` |
| área de toque | `h-toque`, `size-toque`, `min-h-toque` (44px) no celular; pode reduzir com `sm:h-8` | `h-7`/`h-8` sozinho no celular |
| sombra | `shadow-suave` / `shadow-media` / `shadow-alta` | `shadow-lg shadow-vinho/20` |
| pílula do mês | `rounded-chip` | `rounded-[3px]` |
| gaveta (janela no celular) | `rounded-t-gaveta` (já no `DialogContent`) | — |
| animação de entrada | `.surgir` (usa `--duracao-lenta` + `--curva-saida`) | durações soltas |

## Regras

- **Botões e campos do kit já nascem com 44px no celular** (`components/ui/button.tsx`, `input.tsx`,
  `select.tsx`; o `switch` tem área de toque invisível maior). A partir de `sm` voltam ao tamanho compacto.
  Para manter 44px também no computador, use `h-toque sm:h-toque` (é o que `Campo` e `BotaoEnviar` fazem).
- **`cn` do projeto** (`src/lib/utils.ts`) conhece os tokens (toque, mini, destaque, suave/media/alta,
  chip/gaveta). Criou token novo no `@theme`? Acrescente lá, senão a junção de classes não resolve o conflito.
- **Celular primeiro.** Tudo que se toca tem ≥44px no celular. Ação principal da tela fica ao alcance do
  polegar (ex.: "+ Marcar" flutuante na agenda, via `<Flutuante>`).
- **Texto ≥11px** e contraste ≥4,5:1 (texto) / ≥3:1 (ícones). Pares conferidos em 08/11/2026: todos os
  status no claro, e primária, texto secundário e realce nos 5 temas (menor: 5,29:1 no rosa).
- **Cor nunca sozinha**: situação também tem ícone (✓, ampulheta, pessoa riscada, cadeado) e o leitor de
  tela ouve o nome (`rotuloAcessivel`).
- **Um botão principal por área.** Ações destrutivas (Cancelar, Remover) ficam separadas e em `ghost`.
- **Janelas** (`Dialog`) no celular sobem de baixo; no computador, centralizadas. Fechar = "Fechar".
- **`position: fixed` dentro de página** sempre via `<Flutuante>` (portal no body), senão a animação
  `.surgir` prende o elemento.
- **Brilho** (`.brilho`) só nos momentos-chave: Entrar e Criar conta (`<BotaoEnviar brilho>`).
- Movimento respeita `prefers-reduced-motion` (já desligado em `globals.css`).

## Movimento (GSAP, só na agenda)

Pouco, rápido e com função. Tudo em `src/features/agenda/movimento.tsx`, valores em `MOVIMENTO`
(0,32s para trocar de período, deslocamento 28px, curva `power3.out`, alinhados a `--duracao-*`/`--curva-saida`).

| Momento | O que acontece |
|---|---|
| Trocar de semana/dia/mês | o conteúdo desliza na direção da navegação (frente = vem da direita; trocar de visão = sobe um pouco) |
| Período carregando | depois de 0,15s o conteúdo esmaece para 55% e ganha `aria-busy` (clique rápido não pisca) |
| Atendimento ou bloqueio recém-salvo | rola até ele e dá um "pulo" (88%→100%) com um anel na cor `--ring` do tema |

- Links que trocam o período usam **`LinkAgenda`** (não `Link`), senão a tela não sabe que está carregando.
- Item que pode ser destacado precisa de `data-agendamento={id}` (cartão, chip do mês, lista da semana).
- Quem pede "menos movimento" no celular não vê deslize, esmaecimento nem pulo: só a troca direta.
- Não espalhar GSAP pelo resto do painel. Animação nova só se ajudar a entender o que mudou.

## Exceções (cor escrita direto, de propósito)

Não usam variáveis CSS porque não rodam no navegador do painel:
- imagens geradas no servidor (satori): `features/stories/temas.ts` e `templates/*`, `app/(site)/site/opengraph-image.tsx`;
- HTML de e-mail: `features/emails/modelos.ts`;
- dados de escolha do usuário: cores de marca sugeridas (`features/perfil/schema.ts`, `FormPerfil`) e
  amostras dos temas (`lib/ramos.ts`);
- `themeColor` da barra do navegador (`app/layout.tsx`).
O site público (`app/(site)`) segue a seção "Site público" abaixo; o fundo creme fica (é a marca), mesmo com o
detector do Impeccable apontando "cream-palette".

## Site público (etapa 5, regras da Taste Skill)

- Título diz o que é e para quem ("Agenda no celular para profissionais de beleza e saúde"); a primeira tela
  tem um fato concreto (3 dias grátis, preço a partir de R$ 29,90).
- Uma ação principal, com o mesmo texto no menu, no topo e no fim: `ACAO_PRINCIPAL_SITE` em `lib/constantes.ts`.
  Os cartões de plano não têm botão (o plano é escolhido depois, no painel).
- Cada parte ocupa uma tela no computador (`md:min-h-[calc(100svh-4rem)]`). Nada aparece "surgindo" ao rolar;
  só o topo entra uma vez ao carregar. Cartões de recurso sobem 2px no hover (`.cartao-vivo`).
- Recursos mostram um pedaço da tela real (componentes `Fragmento*` em `site/page.tsx`), não ícone genérico.
- Textos: sem slogan, sem pergunta como título, sem "solução/simples/poderoso"; nada inventado (clientes,
  números, depoimentos). A aprovação manual do cadastro é dita no site, no cadastro e nos e-mails.
- Cadastro: nome, e-mail, senha primeiro; ramo/tratamento/WhatsApp depois; sem "confirmar senha" (tem o olho);
  sugestão para e-mail digitado errado (`features/auth/sugerir-email.ts`).

## Como conferir

```
node <skill design-system>/scripts/validate-tokens.cjs --dir src/
```
Só devem aparecer as exceções acima.
