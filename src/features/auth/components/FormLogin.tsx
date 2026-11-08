"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { entrar } from "@/features/auth/actions";
import { Campo } from "@/components/formulario/Campo";
import { BotaoEnviar } from "@/components/formulario/BotaoEnviar";
import { Aviso } from "@/components/formulario/Aviso";
import { ESTADO_INICIAL } from "@/components/formulario/tipos";

export function FormLogin({ proximo, mensagem }: { proximo?: string; mensagem?: string }) {
  const [estado, acao] = useActionState(entrar, ESTADO_INICIAL);
  const [verSenha, setVerSenha] = useState(false);

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
        defaultValue={estado.valores?.email}
        erros={estado.erros?.email}
        required
      />
      <div className="relative">
        <Campo
          rotulo="Senha"
          nome="senha"
          type={verSenha ? "text" : "password"}
          autoComplete="current-password"
          erros={estado.erros?.senha}
          className="pr-12"
          required
        />
        <button
          type="button"
          onClick={() => setVerSenha((v) => !v)}
          aria-label={verSenha ? "Esconder senha" : "Mostrar senha"}
          aria-pressed={verSenha}
          className="absolute top-[26px] right-0 flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {verSenha ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
        </button>
      </div>

      <BotaoEnviar textoCarregando="Entrando..." brilho>
        Entrar
      </BotaoEnviar>

      <div className="flex flex-col items-center text-sm">
        <Link href="/recuperar-senha" className="inline-flex min-h-11 items-center px-3 text-muted-foreground underline-offset-4 hover:underline">
          Esqueci minha senha
        </Link>
        <p className="text-muted-foreground">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="inline-flex min-h-11 items-center px-2 font-semibold text-foreground underline-offset-4 hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </form>
  );
}
