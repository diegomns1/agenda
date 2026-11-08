"use client";

import { useFormStatus } from "react-dom";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type * as React from "react";

type Props = React.ComponentProps<typeof Button> & {
  carregando?: boolean;
  textoCarregando?: string;
  /** Brilho que atravessa o botão ao carregar. Só nos momentos-chave (entrar, criar conta); em todo botão perde o efeito. */
  brilho?: boolean;
};

export function BotaoEnviar({
  children,
  carregando,
  textoCarregando = "Aguarde...",
  brilho = false,
  className,
  disabled,
  ...props
}: Props) {
  const { pending } = useFormStatus();
  const ocupado = carregando ?? pending;

  return (
    <Button
      type="submit"
      size="lg"
      className={cn("h-11 w-full rounded-xl text-base font-semibold shadow-md shadow-vinho/20", brilho && "brilho", className)}
      disabled={disabled || ocupado}
      {...props}
    >
      {ocupado ? (
        <>
          <Loader2Icon className="animate-spin" />
          {textoCarregando}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
