"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { toast } from "sonner";
import { clienteComTelefone, salvarCliente } from "@/features/clientes/actions";
import { Campo } from "@/components/formulario/Campo";
import { BotaoEnviar } from "@/components/formulario/BotaoEnviar";
import { Aviso } from "@/components/formulario/Aviso";
import { ESTADO_INICIAL, type EstadoForm } from "@/components/formulario/tipos";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatarTelefone, mascararTelefone } from "@/lib/telefone";
import type { Cliente } from "@/types/database";

type Props = {
  cliente?: Cliente | null;
  /** Nome já digitado na busca ("Cadastrar 'Juliana'"): entra preenchido. */
  nomeInicial?: string;
  /** Chamado depois de salvar; recebe o id (novo ou existente). */
  aoConcluir: (id: string) => void;
};

export function FormCliente({ cliente, nomeInicial, aoConcluir }: Props) {
  const [telefone, setTelefone] = useState(cliente?.telefone ? formatarTelefone(cliente.telefone) : "");
  const [repetido, setRepetido] = useState<{ id: string; nome: string } | null>(null);

  const [estado, acao] = useActionState(async (prev: EstadoForm, fd: FormData) => {
    const r = await salvarCliente(prev, fd);
    if (r.ok) {
      if (r.mensagem) toast.success(r.mensagem);
      aoConcluir(cliente?.id ?? r.valores?.id ?? "");
    }
    // erro: mostrado só aqui no formulário (antes saía também numa notificação, duplicado)
    return r;
  }, ESTADO_INICIAL);

  const v = estado.valores;

  async function conferirTelefone() {
    if (telefone.replace(/\D/g, "").length < 10) return setRepetido(null);
    setRepetido(await clienteComTelefone(telefone, cliente?.id).catch(() => null));
  }

  return (
    <form action={acao} className="grid gap-4" noValidate>
      {cliente ? <input type="hidden" name="id" value={cliente.id} /> : null}
      {estado.erro ? <Aviso>{estado.erro}</Aviso> : null}

      <Campo
        rotulo="Nome"
        nome="nome"
        placeholder="Nome completo"
        autoComplete="off"
        autoCapitalize="words"
        defaultValue={v?.nome ?? cliente?.nome ?? nomeInicial ?? ""}
        erros={estado.erros?.nome}
        required
      />

      <div className="grid gap-1.5">
        <Campo
          rotulo="WhatsApp"
          nome="telefone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="(11) 99999-9999"
          value={telefone}
          onChange={(e) => {
            setTelefone(mascararTelefone(e.target.value));
            setRepetido(null);
          }}
          onBlur={conferirTelefone}
          dica="Usado no botão de lembrete. Pode deixar em branco."
          erros={estado.erros?.telefone}
        />
        {repetido ? (
          <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">
            Já existe <strong className="font-semibold">{repetido.nome}</strong> com esse WhatsApp.{" "}
            <Link href={`/clientes/${repetido.id}`} className="font-semibold underline underline-offset-4">
              Abrir o cadastro
            </Link>
          </p>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          name="observacoes"
          rows={3}
          maxLength={1000}
          placeholder="Ex.: alergia a acetona, prefere esmalte nude, costuma atrasar 10 min…"
          defaultValue={v?.observacoes ?? cliente?.observacoes ?? ""}
          className="text-base"
        />
        {estado.erros?.observacoes?.[0] ? (
          <p className="text-sm text-destructive">{estado.erros.observacoes[0]}</p>
        ) : null}
      </div>

      <BotaoEnviar textoCarregando="Salvando...">{cliente ? "Salvar alterações" : "Cadastrar"}</BotaoEnviar>
    </form>
  );
}
