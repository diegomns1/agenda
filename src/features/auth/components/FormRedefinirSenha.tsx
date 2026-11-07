"use client";

import { useActionState } from "react";
import { redefinirSenha } from "@/features/auth/actions";
import { Campo } from "@/components/formulario/Campo";
import { BotaoEnviar } from "@/components/formulario/BotaoEnviar";
import { Aviso } from "@/components/formulario/Aviso";
import { ESTADO_INICIAL } from "@/components/formulario/tipos";

export function FormRedefinirSenha() {
  const [estado, acao] = useActionState(redefinirSenha, ESTADO_INICIAL);

  return (
    <form action={acao} className="grid gap-4" noValidate>
      {estado.erro ? <Aviso>{estado.erro}</Aviso> : null}

      <Campo
        rotulo="Nova senha"
        nome="senha"
        type="password"
        autoComplete="new-password"
        dica="Pelo menos 6 caracteres"
        erros={estado.erros?.senha}
        required
      />
      <Campo
        rotulo="Confirmar nova senha"
        nome="confirmarSenha"
        type="password"
        autoComplete="new-password"
        erros={estado.erros?.confirmarSenha}
        required
      />

      <BotaoEnviar textoCarregando="Salvando...">Salvar nova senha</BotaoEnviar>
    </form>
  );
}
