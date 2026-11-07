"use client";

import Link from "next/link";
import { useActionState } from "react";
import { cadastrar } from "@/features/auth/actions";
import { Campo } from "@/components/formulario/Campo";
import { BotaoEnviar } from "@/components/formulario/BotaoEnviar";
import { Aviso } from "@/components/formulario/Aviso";
import { ESTADO_INICIAL } from "@/components/formulario/tipos";

export function FormCadastro() {
  const [estado, acao] = useActionState(cadastrar, ESTADO_INICIAL);

  if (estado.ok) {
    return (
      <div className="grid gap-4">
        <Aviso tipo="sucesso">{estado.mensagem}</Aviso>
        <Link href="/login" className="text-center text-sm font-medium underline-offset-4 hover:underline">
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={acao} className="grid gap-4" noValidate>
      {estado.erro ? <Aviso>{estado.erro}</Aviso> : null}

      <Campo
        rotulo="Seu nome"
        nome="nome"
        autoComplete="name"
        placeholder="Como suas clientes te chamam"
        defaultValue={estado.valores?.nome}
        erros={estado.erros?.nome}
        required
      />
      <Campo
        rotulo="WhatsApp (opcional)"
        nome="telefone"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        placeholder="(11) 99999-9999"
        defaultValue={estado.valores?.telefone}
        erros={estado.erros?.telefone}
      />
      <Campo
        rotulo="E-mail"
        nome="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="voce@exemplo.com"
        defaultValue={estado.valores?.email}
        erros={estado.erros?.email}
        required
      />
      <Campo
        rotulo="Senha"
        nome="senha"
        type="password"
        autoComplete="new-password"
        dica="Pelo menos 6 caracteres"
        erros={estado.erros?.senha}
        required
      />
      <Campo
        rotulo="Confirmar senha"
        nome="confirmarSenha"
        type="password"
        autoComplete="new-password"
        erros={estado.erros?.confirmarSenha}
        required
      />

      <BotaoEnviar textoCarregando="Criando conta...">Criar conta</BotaoEnviar>

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
