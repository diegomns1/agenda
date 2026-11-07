"use client";

import Link from "next/link";
import { useActionState } from "react";
import { recuperarSenha } from "@/features/auth/actions";
import { Campo } from "@/components/formulario/Campo";
import { BotaoEnviar } from "@/components/formulario/BotaoEnviar";
import { Aviso } from "@/components/formulario/Aviso";
import { ESTADO_INICIAL } from "@/components/formulario/tipos";

export function FormRecuperarSenha() {
  const [estado, acao] = useActionState(recuperarSenha, ESTADO_INICIAL);

  return (
    <form action={acao} className="grid gap-4" noValidate>
      {estado.ok ? <Aviso tipo="sucesso">{estado.mensagem}</Aviso> : null}
      {estado.erro ? <Aviso>{estado.erro}</Aviso> : null}

      <Campo
        rotulo="E-mail da conta"
        nome="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        erros={estado.erros?.email}
        required
      />

      <BotaoEnviar textoCarregando="Enviando...">Enviar link</BotaoEnviar>

      <Link href="/login" className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
        Voltar para o login
      </Link>
    </form>
  );
}
