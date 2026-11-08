import { CircleCheckIcon, TriangleAlertIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  tipo?: "erro" | "sucesso";
  children: React.ReactNode;
  className?: string;
};

/** Caixa de aviso inline (erro geral do formulário ou mensagem de sucesso). */
export function Aviso({ tipo = "erro", children, className }: Props) {
  const Icone = tipo === "erro" ? TriangleAlertIcon : CircleCheckIcon;
  return (
    <div
      role={tipo === "erro" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm",
        tipo === "erro"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-sucesso-borda bg-sucesso text-sucesso-texto",
        className,
      )}
    >
      <Icone className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
