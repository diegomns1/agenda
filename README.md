# Agenda (nome provisório)

SaaS de agenda de serviços para profissionais autônomas (manicures, cabeleireiras, etc.).
Next.js 16 (App Router) + TypeScript + Tailwind 4 + shadcn/ui + Supabase + PWA.

Decisões e regras do projeto: ver [CLAUDE.md](./CLAUDE.md).

## Rodar localmente

1. **Supabase**: crie um projeto em <https://supabase.com> (região São Paulo).
2. No **SQL Editor**, rode os arquivos de `supabase/migrations/` em ordem (`0001_base.sql`, ...).
3. Em **Authentication → Providers → Email**, desligue *Confirm email* durante a fase de testes
   (menos atrito no cadastro). Em **Authentication → URL Configuration**, adicione
   `http://localhost:3000/auth/callback` em *Redirect URLs*.
4. Copie `.env.example` para `.env.local` e preencha com os valores de **Project Settings → API**.
5. Instale e rode:

```bash
npm install
npm run dev
```

6. Abra <http://localhost:3000>, crie uma conta. Ela nasce "aguardando aprovação".
7. Torne seu usuário admin (SQL Editor), saia e entre de novo:

```sql
update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'
 where email = 'seu@email.com';
```

8. Acesse <http://localhost:3000/admin> para aprovar, recusar ou suspender contas e definir plano/validade.

## Scripts

| comando | o que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção (também valida tipos) |
| `npm run lint` | ESLint |

## Estrutura

```
supabase/migrations/   SQL numerado (nunca editar um já aplicado; criar o próximo)
src/app/               rotas (finas) — (publico), (app), admin, api, auth/callback
src/features/<modulo>/ actions.ts · queries.ts · schema.ts · components/
src/components/        ui/ (shadcn) · formulario/ · layout/
src/lib/               supabase/ · auth.ts · datas.ts · telefone.ts · constantes.ts
src/types/             database.ts (tipos do banco)
src/proxy.ts           renova sessão e protege rotas (/login, /admin, ...)
```
