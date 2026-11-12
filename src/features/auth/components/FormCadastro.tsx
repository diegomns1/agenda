"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { cadastrar } from "@/features/auth/actions";
import { Campo } from "@/components/formulario/Campo";
import { BotaoEnviar } from "@/components/formulario/BotaoEnviar";
import { Aviso } from "@/components/formulario/Aviso";
import { ESTADO_INICIAL } from "@/components/formulario/tipos";
import { SeletorRamo } from "@/components/formulario/SeletorRamo";
import { EscolhaTratamento } from "@/components/formulario/EscolhaTratamento";
import { sugerirEmail } from "@/features/auth/sugerir-email";
import { rastrear, rastrearCadastroGoogle } from "@/features/rastreio/navegador";

/*
 * Cadastro (etapa 5): o fácil primeiro (nome, e-mail, senha), depois o que personaliza o painel.
 * Sem "confirmar senha": o olho mostra o que foi digitado. E-mail com erro comum de digitação
 * ("gmial.com") ganha uma sugestão de um toque.
 */
export function FormCadastro() {
  const [estado, acao] = useActionState(cadastrar, ESTADO_INICIAL);
  const [verSenha, setVerSenha] = useState(false);
  const [email, setEmail] = useState(estado.valores?.email ?? "");
  const [sugestao, setSugestao] = useState<string | null>(null);
  // mesmo código no pixel (navegador) e na API de Conversões (servidor): a Meta conta o Lead uma vez só
  const [eventoId, setEventoId] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- gerado só no navegador (evita diferença com o servidor)
    setEventoId(crypto.randomUUID());
  }, []);
  useEffect(() => {
    if (!estado.ok) return;
    // cadastro deu certo: avisa os anúncios (só com o "Aceitar" dos cookies) e, se já entrou, abre a agenda
    if (eventoId) {
      rastrear("Lead", {}, eventoId);
      rastrearCadastroGoogle(eventoId);
    }
    if (estado.destino) {
      const destino = estado.destino;
      // um instante para os avisos saírem antes de trocar de página
      const t = setTimeout(() => window.location.assign(destino), 600);
      return () => clearTimeout(t);
    }
  }, [estado.ok, estado.destino, eventoId]);

  if (estado.ok) {
    return (
      <div className="grid gap-4">
        <Aviso tipo="sucesso">{estado.mensagem}</Aviso>
        {estado.destino ? null : (
          <Link href="/login" className="inline-flex min-h-toque items-center justify-center text-sm font-medium underline-offset-4 hover:underline">
            Ir para o login
          </Link>
        )}
      </div>
    );
  }

  return (
    <form action={acao} className="grid gap-4" noValidate>
      <input type="hidden" name="evento_id" value={eventoId} />
      {estado.erro ? <Aviso>{estado.erro}</Aviso> : null}

      <Campo
        rotulo="Seu nome"
        nome="nome"
        autoComplete="name"
        placeholder="Como seus clientes te chamam"
        defaultValue={estado.valores?.nome}
        erros={estado.erros?.nome}
        required
      />
      <div className="grid gap-1.5">
        <Campo
          rotulo="E-mail"
          nome="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="voce@exemplo.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setSugestao(null);
          }}
          onBlur={() => setSugestao(sugerirEmail(email))}
          erros={estado.erros?.email}
          required
        />
        {sugestao ? (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Você quis dizer{" "}
            <button
              type="button"
              className="inline-flex min-h-toque items-center font-semibold text-primary underline underline-offset-4"
              onClick={() => {
                setEmail(sugestao);
                setSugestao(null);
              }}
            >
              {sugestao}
            </button>
            ?
          </p>
        ) : null}
      </div>
      <div className="relative">
        <Campo
          rotulo="Senha"
          nome="senha"
          type={verSenha ? "text" : "password"}
          autoComplete="new-password"
          dica="Pelo menos 6 caracteres"
          erros={estado.erros?.senha}
          className="pr-12"
          required
        />
        <button
          type="button"
          onClick={() => setVerSenha((v) => !v)}
          aria-label={verSenha ? "Esconder senha" : "Mostrar senha"}
          aria-pressed={verSenha}
          className="absolute top-[26px] right-0 flex size-toque items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:size-toque"
        >
          {verSenha ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
        </button>
      </div>

      <fieldset className="mt-1 grid gap-4 border-t pt-4">
        <legend className="sr-only">Sobre o seu trabalho</legend>
        <p className="text-sm text-muted-foreground">Para o painel já abrir com as palavras do seu ramo:</p>
        <SeletorRamo ramoInicial={estado.valores?.ramo} outroInicial={estado.valores?.ramo_outro} erro={estado.erros?.ramo?.[0]} />
        <EscolhaTratamento
          inicial={estado.valores?.tratamento as "ela" | "ele" | "neutro" | undefined}
          erro={estado.erros?.tratamento?.[0]}
        />
        <Campo
          rotulo="WhatsApp (opcional)"
          nome="telefone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="(11) 99999-9999"
          dica="Só para falarmos com você sobre a conta."
          defaultValue={estado.valores?.telefone}
          erros={estado.erros?.telefone}
        />
      </fieldset>

      <div className="grid gap-1.5">
        <label className="flex min-h-toque items-start gap-2.5 text-sm leading-snug">
          <input
            type="checkbox"
            name="aceite"
            defaultChecked={estado.valores?.aceite === "on"}
            className="mt-0.5 size-5 shrink-0 accent-primary"
            aria-invalid={estado.erros?.aceite ? true : undefined}
          />
          <span>
            Li e aceito os{" "}
            <Link href="/termos" target="_blank" className="font-medium text-primary underline underline-offset-4">
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link href="/privacidade" target="_blank" className="font-medium text-primary underline underline-offset-4">
              Política de Privacidade
            </Link>
            .
          </span>
        </label>
        {estado.erros?.aceite?.[0] ? <p className="text-sm text-destructive">{estado.erros.aceite[0]}</p> : null}
      </div>

      <BotaoEnviar textoCarregando="Criando conta..." brilho>
        Criar minha conta
      </BotaoEnviar>

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="inline-flex min-h-toque items-center px-1 font-semibold text-foreground underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
