"use client";

import Link from "next/link";
import { useActionState } from "react";
import { entrar } from "@/features/auth/actions";
import { Campo } from "@/components/formulario/Campo";
import { BotaoEnviar } from "@/components/formulario/BotaoEnviar";
import { Aviso } from "@/components/formulario/Aviso";
import { ESTADO_INICIAL } from "@/components/formulario/tipos";

export function FormLogin({ proximo, mensagem }: { proximo?: string; mensagem?: string }) {
  const [estado, acao] = useActionState(entrar, ESTADO_INICIAL);

  return (
    <form action={acao} className="grid gap-4" noValidate>
      {proximo ? <input type="hidden" name="proximo" value={proximo} /> : null}

      {mensagem ? <Aviso tipo="sucesso">{mensagem}</Aviso> : null}
      {estado.erro ? <Aviso>{estado.erro}</Aviso> : null}

      <Campo
        rotulo="E-mail"
        nome="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="voce@exemplo.com"
        erros={estado.erros?.email}
        required
      />
      <Campo
        rotulo="Senha"
        nome="senha"
        type="password"
        autoComplete="current-password"
        erros={estado.erros?.senha}
        required
      />

      <BotaoEnviar textoCarregando="Entrando...">Entrar</BotaoEnviar>

      <div className="flex flex-col items-center gap-2 text-sm">
        <Link href="/recuperar-senha" className="text-muted-foreground underline-offset-4 hover:underline">
          Esqueci minha senha
        </Link>
        <p className="text-muted-foreground">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-foreground underline-offset-4 hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </form>
  );
}
