"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2Icon, Loader2Icon, LockIcon, MessageCircleIcon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { desconectarWhatsApp, gerarConexaoWhatsApp } from "../actions";

type Props = {
  /** número conectado, já formatado; null = não conectado */
  conectado: string | null;
  /** plano com a assistente (Premium) */
  permitido: boolean;
};

/** Quadro do Perfil: conectar o WhatsApp da profissional à assistente da Vaguinha. */
export function ConectarWhatsApp({ conectado, permitido }: Props) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [codigo, setCodigo] = useState<{ codigo: string; link: string } | null>(null);
  const [confirmarSaida, setConfirmarSaida] = useState(false);

  function conectar() {
    iniciar(async () => {
      const r = await gerarConexaoWhatsApp();
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      setCodigo({ codigo: r.codigo, link: r.link });
      window.open(r.link, "_blank", "noopener");
    });
  }

  function desconectar() {
    iniciar(async () => {
      const r = await desconectarWhatsApp();
      if (!r.ok) toast.error(r.erro ?? "Não deu certo.");
      else toast.success("WhatsApp desconectado.");
      setConfirmarSaida(false);
      router.refresh();
    });
  }

  return (
    <Card id="whatsapp" className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircleIcon className="size-5 text-primary" aria-hidden />
          Assistente no WhatsApp
        </CardTitle>
        <CardDescription>
          Converse com a assistente pelo seu próprio WhatsApp: pergunte a agenda, marque, remarque e cadastre clientes sem abrir o app.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {!permitido ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <LockIcon className="size-4" aria-hidden />
              Faz parte do plano Premium.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/assinatura">Ver planos</Link>
            </Button>
          </div>
        ) : conectado ? (
          <>
            <p className="inline-flex items-center gap-2 text-sm font-medium text-sucesso-forte">
              <CheckCircle2Icon className="size-4" aria-hidden />
              Conectado ao número {conectado}
            </p>
            <p className="text-sm text-muted-foreground">É só mandar mensagem para a Vaguinha no WhatsApp. Para trocar de número, conecte de novo pelo número novo.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={conectar} disabled={pendente}>
                <RefreshCwIcon />
                Conectar outro número
              </Button>
              {confirmarSaida ? (
                <Button variant="destructive" onClick={desconectar} disabled={pendente}>
                  {pendente ? <Loader2Icon className="animate-spin" /> : null}
                  Sim, desconectar
                </Button>
              ) : (
                <Button variant="ghost" onClick={() => setConfirmarSaida(true)} disabled={pendente}>
                  Desconectar
                </Button>
              )}
            </div>
          </>
        ) : (
          <Button onClick={conectar} disabled={pendente} className="w-fit">
            {pendente ? <Loader2Icon className="animate-spin" /> : <MessageCircleIcon />}
            Conectar meu WhatsApp
          </Button>
        )}

        {codigo ? (
          <div className="grid gap-2 rounded-2xl border bg-muted/40 p-3 text-sm">
            <p className="font-medium">Abrimos o WhatsApp com a mensagem pronta. É só tocar em enviar.</p>
            <p className="text-muted-foreground">
              Não abriu?{" "}
              <a href={codigo.link} target="_blank" rel="noopener" className="font-medium text-primary underline underline-offset-2">
                Toque aqui
              </a>{" "}
              ou mande para a Vaguinha: <span className="font-mono font-semibold text-foreground">Conectar Vaguinha código {codigo.codigo}</span> (vale 15 minutos).
            </p>
            <Button variant="outline" size="sm" className="w-fit" onClick={() => router.refresh()}>
              Já enviei
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
