"use client";

import { useSyncExternalStore } from "react";
import { aoMudarPreferencia, guardarPreferencia, lerPreferencia, sistemaDoNavegador, type AppWhatsApp } from "@/features/mensagens/abrirWhatsApp";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const OPCOES: { valor: AppWhatsApp | null; nome: string }[] = [
  { valor: null, nome: "Perguntar toda vez" },
  { valor: "normal", nome: "WhatsApp" },
  { valor: "business", nome: "WhatsApp Business" },
  { valor: "celular", nome: "Só tenho um" },
];

const naoMuda = () => () => {};

/** Escolha do WhatsApp deste celular (no computador não aparece: lá abre sempre o WhatsApp Web). */
export function PreferenciaWhatsApp() {
  const sistema = useSyncExternalStore(naoMuda, sistemaDoNavegador, () => "computador" as const);
  const atual = useSyncExternalStore(aoMudarPreferencia, lerPreferencia, () => null);
  if (sistema === "computador") return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Abrir em qual WhatsApp?</CardTitle>
        <CardDescription>
          Para quem tem dois no mesmo celular. Vale só para este aparelho.
          {sistema === "iphone" ? " No iPhone, se abrir no errado, troque a opção aqui." : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        {OPCOES.map(({ valor, nome }) => (
          <button
            key={nome}
            type="button"
            aria-pressed={atual === valor}
            onClick={() => guardarPreferencia(valor)}
            className={cn(
              "min-h-toque rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors",
              atual === valor ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50",
            )}
          >
            {nome}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
