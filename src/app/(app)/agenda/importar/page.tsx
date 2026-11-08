import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { ImportarAgenda } from "@/features/importar/components/ImportarAgenda";

export const metadata: Metadata = { title: "Importar agenda" };

export default function PaginaImportarAgenda() {
  return (
    <div className="grid grid-cols-1 gap-5">
      <div>
        <Link href="/agenda" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeftIcon className="size-4" />
          Agenda
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Importar do Google Agenda</h1>
        <p className="text-sm text-muted-foreground">Traga seus horários de uma vez, sem cadastrar um por um.</p>
      </div>
      <ImportarAgenda />
    </div>
  );
}
