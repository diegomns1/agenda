import type { Metadata } from "next";
import { listarContatos } from "@/features/whatsapp/central";
import { CentralWhatsApp } from "@/features/whatsapp/components/CentralWhatsApp";

export const metadata: Metadata = { title: "Central do WhatsApp" };

export default async function PaginaCentralWhatsApp({ searchParams }: PageProps<"/admin/whatsapp">) {
  const { c } = await searchParams;
  const contatos = await listarContatos();

  return (
    // o admin é estreito (max-w-3xl); o kanban usa a largura toda da tela
    <div className="relative left-1/2 w-screen -translate-x-1/2 px-4">
      <div className="mx-auto max-w-[96rem]">
        <CentralWhatsApp inicial={contatos} abrir={typeof c === "string" ? c.replace(/\D/g, "") : undefined} />
      </div>
    </div>
  );
}
