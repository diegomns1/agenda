import type { LucideIcon } from "lucide-react";

type Props = {
  Icone: LucideIcon;
  titulo: string;
  descricao?: string;
  children?: React.ReactNode;
};

export function EstadoVazio({ Icone, titulo, descricao, children }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icone className="size-6" />
      </div>
      <div>
        <p className="font-medium">{titulo}</p>
        {descricao ? <p className="mt-1 text-sm text-muted-foreground">{descricao}</p> : null}
      </div>
      {children ? <div className="mt-1 flex flex-wrap justify-center gap-2">{children}</div> : null}
    </div>
  );
}
