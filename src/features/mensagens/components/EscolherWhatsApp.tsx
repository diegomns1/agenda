"use client";

import { useEffect, useState } from "react";
import { BriefcaseBusinessIcon } from "lucide-react";
import { abrirNoApp, guardarPreferencia, registrarPergunta, type AppWhatsApp, type Conversa } from "@/features/mensagens/abrirWhatsApp";
import { IconeWhatsApp } from "@/components/marca/IconeWhatsApp";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const OPCOES: { app: AppWhatsApp; nome: string; detalhe: string }[] = [
  { app: "normal", nome: "WhatsApp", detalhe: "O aplicativo normal" },
  { app: "business", nome: "WhatsApp Business", detalhe: "O aplicativo para negócios" },
];

/** Pergunta por qual WhatsApp mandar a mensagem (fica no layout; quem chama é abrirWhatsApp). */
export function EscolherWhatsApp() {
  const [conversa, setConversa] = useState<Conversa | null>(null);
  const [lembrar, setLembrar] = useState(true);

  useEffect(() => {
    registrarPergunta(setConversa);
    return () => registrarPergunta(null);
  }, []);

  function escolher(app: AppWhatsApp) {
    if (!conversa) return;
    if (lembrar) guardarPreferencia(app);
    abrirNoApp(conversa, app);
    setConversa(null);
  }

  return (
    <Dialog open={conversa !== null} onOpenChange={(a) => !a && setConversa(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Por qual WhatsApp você quer mandar?</DialogTitle>
          <DialogDescription>Escolha o aplicativo do número que você usa com as clientes.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {OPCOES.map(({ app, nome, detalhe }) => (
            <button
              key={app}
              type="button"
              onClick={() => escolher(app)}
              className="flex min-h-toque items-center gap-3 rounded-2xl border p-3 text-left transition-colors hover:bg-muted/50"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-whatsapp" aria-hidden>
                {app === "business" ? <BriefcaseBusinessIcon className="size-5" /> : <IconeWhatsApp className="size-5" />}
              </span>
              <span className="min-w-0">
                <span className="block text-destaque font-semibold">{nome}</span>
                <span className="block text-xs text-muted-foreground">{detalhe}</span>
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => escolher("celular")}
            className="min-h-toque text-sm font-semibold text-muted-foreground underline-offset-4 hover:underline"
          >
            Só tenho um WhatsApp
          </button>
        </div>
        <div className="flex items-center justify-between gap-3 border-t pt-3">
          <Label htmlFor="lembrar-whatsapp" className="grid gap-0.5 text-sm">
            Lembrar neste celular
            <span className="text-xs font-normal text-muted-foreground">Para trocar depois: Perfil, em Mensagens do WhatsApp.</span>
          </Label>
          <Switch id="lembrar-whatsapp" checked={lembrar} onCheckedChange={setLembrar} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
