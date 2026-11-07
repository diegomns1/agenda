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

Remetente: por padrão sai de `noreply@mail.app.supabase.io`. Para sair de `@vaguinha.app`,
configure **SMTP Settings** com o Resend (host `smtp.resend.com`, porta 465, usuário `resend`,
senha = a API key) depois de verificar o domínio no Resend.
