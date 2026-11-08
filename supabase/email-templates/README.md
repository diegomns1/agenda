# Modelos de e-mail do Supabase Auth (em português)

Estes são os e-mails que o **Supabase** manda sozinho (redefinir senha, confirmar e-mail etc.).
Eles são configurados no painel do Supabase, não no código:

**Authentication → Emails → Templates** (projeto `supabase-aureolin-car`).

Para cada aba, cole o **Subject** e o **Body** do arquivo correspondente:

| aba no Supabase | arquivo | quando é enviado |
|---|---|---|
| Reset password | `reset-password.html` | "Esqueci minha senha" |
| Confirm signup | `confirm-signup.html` | só se "Confirm email" for ligado (hoje está desligado) |
| Magic link | `magic-link.html` | não usamos, mas fica em português por garantia |
| Change email address | `change-email.html` | troca de e-mail da conta |
| Invite user | `invite.html` | convite manual pelo painel |
| Reauthentication | `reauthentication.html` | confirmação com código |

Variáveis disponíveis: `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .SiteURL }}`, `{{ .Email }}`, `{{ .NewEmail }}`.

Remetente: desde 08/11/2026 os e-mails saem de **Vaguinha <contato@vaguinha.app>** pelo SMTP do Resend
(host `smtp.resend.com`, porta 465, usuário `resend`, senha = uma API key do Resend). Os 6 modelos acima já estão
colados no Supabase. Respostas a `contato@` vão para a caixa na hadcloud, que encaminha para o Diego.
