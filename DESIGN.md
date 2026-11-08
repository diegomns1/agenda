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

## Exceções (cor escrita direto, de propósito)

Não usam variáveis CSS porque não rodam no navegador do painel:
- imagens geradas no servidor (satori): `features/stories/temas.ts` e `templates/*`, `app/(site)/site/opengraph-image.tsx`;
- HTML de e-mail: `features/emails/modelos.ts`;
- dados de escolha do usuário: cores de marca sugeridas (`features/perfil/schema.ts`, `FormPerfil`) e
  amostras dos temas (`lib/ramos.ts`);
- `themeColor` da barra do navegador (`app/layout.tsx`).
O site público (`app/(site)`) ainda tem valores próprios e entra na etapa 5 do plano.

## Como conferir

```
node <skill design-system>/scripts/validate-tokens.cjs --dir src/
```
Só devem aparecer as exceções acima.
