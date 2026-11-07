import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type * as React from "react";

type Props = React.ComponentProps<typeof Input> & {
  rotulo: string;
  nome: string;
  erros?: string[];
  dica?: string;
};

/** Label + Input + mensagem de erro, no padrão do app (altura confortável para toque). */
export function Campo({ rotulo, nome, erros, dica, className, id, ...props }: Props) {
  const campoId = id ?? nome;
  const erro = erros?.[0];

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={campoId}>{rotulo}</Label>
      <Input
        id={campoId}
        name={nome}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${campoId}-erro` : dica ? `${campoId}-dica` : undefined}
        className={cn("h-11 text-base", className)}
        {...props}
      />
      {erro ? (
        <p id={`${campoId}-erro`} className="text-sm text-destructive">
          {erro}
        </p>
      ) : dica ? (
        <p id={`${campoId}-dica`} className="text-sm text-muted-foreground">
          {dica}
        </p>
      ) : null}
    </div>
  );
}
