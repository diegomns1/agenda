import type { Metadata } from "next";
import { Suspense } from "react";
import { contarClientes, listarClientes } from "@/features/clientes/queries";
import { ListaClientes } from "@/features/clientes/components/ListaClientes";
import { CampoBusca } from "@/features/clientes/components/CampoBusca";
import { Aviso } from "@/components/formulario/Aviso";

export const metadata: Metadata = { title: "Clientes" };

export default async function PaginaClientes({ searchParams }: PageProps<"/clientes">) {
  const { q, msg } = await searchParams;
  const busca = typeof q === "string" ? q : undefined;
  const [clientes, total] = await Promise.all([listarClientes(busca), contarClientes()]);

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        <p className="text-sm text-muted-foreground">Quem você atende, com WhatsApp e observações.</p>
      </div>

      {msg === "excluida" ? <Aviso tipo="sucesso">Cadastro excluído.</Aviso> : null}

      {total > 0 || busca ? (
        <Suspense>
          <CampoBusca />
        </Suspense>
      ) : null}

      <ListaClientes clientes={clientes} total={total} busca={busca} />
    </div>
  );
}
