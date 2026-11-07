import type { Metadata } from "next";
import { listarServicos } from "@/features/servicos/queries";
import { ListaServicos } from "@/features/servicos/components/ListaServicos";

export const metadata: Metadata = { title: "Serviços" };

export default async function PaginaServicos() {
  const servicos = await listarServicos();

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Serviços</h1>
        <p className="text-sm text-muted-foreground">O que você oferece, com duração e valor.</p>
      </div>
      <ListaServicos servicos={servicos} />
    </div>
  );
}
