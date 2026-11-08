# Leva as variáveis do Vaguinha da Vercel para a VPS SEM ninguém copiar nada e SEM mostrar valores na tela.
# Roda no computador do Diego (PowerShell):
#   powershell -ExecutionPolicy Bypass -File C:\claude\agenda-saas\deploy\vps\trazer-variaveis.ps1
# O que acontece:
#   1) login na Vercel (abre o navegador: clicar em Autorizar)
#   2) baixa as variáveis do projeto "agenda" para uma pasta temporária
#   3) as que a Vercel não entrega (marcadas como secretas) são pedidas aqui, sem aparecer ao digitar/colar
#   4) envia tudo para /root/vaguinha/config/env na VPS e apaga a cópia local
$ErrorActionPreference = "Stop"
$VPS = "root@179.198.107.151"
$tmp = Join-Path $env:TEMP ("vaguinha-" + [guid]::NewGuid().ToString("N").Substring(0, 8))
New-Item -ItemType Directory -Path $tmp | Out-Null

function Ler-Env($arquivo) {
  $h = @{}
  if (Test-Path $arquivo) {
    foreach ($linha in Get-Content $arquivo) {
      if ($linha -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)$') {
        $v = $Matches[2].Trim()
        if ($v.Length -ge 2 -and $v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Substring(1, $v.Length - 2) }
        $v = $v -replace '\\n', "`n"
        if ($v -ne "") { $h[$Matches[1]] = $v }
      }
    }
  }
  return $h
}

function Primeiro($h, [string[]]$nomes) {
  foreach ($n in $nomes) { if ($h.ContainsKey($n) -and $h[$n]) { return $h[$n] } }
  return $null
}

function Pedir-Segredo($nome, $dica) {
  Write-Host ""
  Write-Host "== $nome" -ForegroundColor Cyan
  Write-Host "   $dica"
  $s = Read-Host "   Cole e tecle Enter (não aparece na tela)" -AsSecureString
  $p = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
  return $p.Trim()
}

try {
  Write-Host ""
  Write-Host "PASSO 1 de 3: login na Vercel. Vai abrir o navegador: confira e clique em Autorizar / Confirm." -ForegroundColor Yellow
  npx --yes vercel@latest login
  if ($LASTEXITCODE -ne 0) { throw "Login na Vercel não terminou." }

  Write-Host ""
  Write-Host "PASSO 2 de 3: baixando as variáveis do projeto agenda..." -ForegroundColor Yellow
  npx --yes vercel@latest link --yes --project agenda --scope diegomns --cwd $tmp *> $null
  if ($LASTEXITCODE -ne 0) { throw "Não consegui ligar ao projeto agenda na Vercel." }
  npx --yes vercel@latest env pull (Join-Path $tmp ".env.vercel") --environment=production --yes --cwd $tmp *> $null
  if ($LASTEXITCODE -ne 0) { throw "Não consegui baixar as variáveis da Vercel." }
  $v = Ler-Env (Join-Path $tmp ".env.vercel")
  Write-Host ("   {0} variáveis recebidas da Vercel." -f $v.Count)

  # monta o arquivo da VPS com os nomes que o app usa
  $final = [ordered]@{
    NEXT_PUBLIC_APP_URL          = "https://painel.vaguinha.app"
    NEXT_PUBLIC_SUPABASE_URL     = Primeiro $v @("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL")
    NEXT_PUBLIC_SUPABASE_ANON_KEY = Primeiro $v @("NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY")
    SUPABASE_SERVICE_ROLE_KEY    = Primeiro $v @("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY")
    NEXT_PUBLIC_VAPID_PUBLIC_KEY = Primeiro $v @("NEXT_PUBLIC_VAPID_PUBLIC_KEY")
    VAPID_PRIVATE_KEY            = Primeiro $v @("VAPID_PRIVATE_KEY")
    VAPID_SUBJECT                = Primeiro $v @("VAPID_SUBJECT")
    CRON_SECRET                  = Primeiro $v @("CRON_SECRET")
    EMAIL_REMETENTE              = Primeiro $v @("EMAIL_REMETENTE")
    EMAIL_ADMIN                  = Primeiro $v @("EMAIL_ADMIN")
    RESEND_API_KEY               = Primeiro $v @("RESEND_API_KEY")
    ANTHROPIC_API_KEY            = Primeiro $v @("ANTHROPIC_API_KEY")
    ASAAS_AMBIENTE               = Primeiro $v @("ASAAS_AMBIENTE")
    ASAAS_API_KEY                = Primeiro $v @("ASAAS_API_KEY")
    ASAAS_WEBHOOK_TOKEN          = Primeiro $v @("ASAAS_WEBHOOK_TOKEN")
  }
  if (-not $final.EMAIL_REMETENTE) { $final.EMAIL_REMETENTE = "Vaguinha <contato@vaguinha.app>" }
  if (-not $final.ASAAS_AMBIENTE) { $final.ASAAS_AMBIENTE = "producao" }

  Write-Host ""
  Write-Host "PASSO 3 de 3: o que a Vercel não entrega (marcado como secreto), você cola das suas anotações." -ForegroundColor Yellow
  $dicas = @{
    ANTHROPIC_API_KEY   = "Chave da API do Claude (começa com sk-ant-)."
    ASAAS_API_KEY       = "Chave da API do Asaas (conta real, começa com `$aact_)."
    ASAAS_WEBHOOK_TOKEN = "Token do webhook do Asaas (o mesmo cadastrado no webhook)."
    RESEND_API_KEY      = "Chave da API do Resend (começa com re_)."
    EMAIL_ADMIN         = "Seu e-mail para receber o aviso de cadastro novo."
  }
  foreach ($nome in @($final.Keys)) {
    if (-not $final[$nome]) {
      $dica = if ($dicas.ContainsKey($nome)) { $dicas[$nome] } else { "A Vercel não entregou este. Se não souber, deixe vazio (Enter) e avise o Claude." }
      $final[$nome] = Pedir-Segredo $nome $dica
    }
  }

  $faltando = @($final.Keys | Where-Object { -not $final[$_] })
  # O Next lê o arquivo com "expansão": um $ no valor (a chave do Asaas começa com $aact_) viraria outra variável.
  # Por isso todo $ vai como \$.
  $conteudo = ($final.Keys | Where-Object { $final[$_] } | ForEach-Object { "$_=" + ($final[$_] -replace '\$', '\$') }) -join "`n"

  Write-Host ""
  Write-Host "Enviando para a VPS..." -ForegroundColor Yellow
  ($conteudo + "`n") | ssh $VPS "umask 077; mkdir -p /root/vaguinha/config; cat > /root/vaguinha/config/env.novo && mv /root/vaguinha/config/env.novo /root/vaguinha/config/env && chmod 600 /root/vaguinha/config/env && echo ok-vps"
  if ($LASTEXITCODE -ne 0) { throw "Não consegui gravar na VPS." }

  Write-Host ""
  Write-Host "PRONTO. Gravado na VPS:" -ForegroundColor Green
  $final.Keys | Where-Object { $final[$_] } | ForEach-Object { Write-Host "   ok  $_" }
  if ($faltando.Count) {
    Write-Host "Ficaram vazios (avise o Claude):" -ForegroundColor Red
    $faltando | ForEach-Object { Write-Host "   --  $_" }
  }
  Write-Host ""
  Write-Host "Pode fechar esta janela e avisar o Claude que terminou." -ForegroundColor Green
}
catch {
  Write-Host ""
  Write-Host ("Parou: " + $_.Exception.Message) -ForegroundColor Red
  Write-Host "Nada foi mostrado na tela. Pode rodar de novo."
}
finally {
  if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
}
