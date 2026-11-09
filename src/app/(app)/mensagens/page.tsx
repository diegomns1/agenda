import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/auth";
import { URL_APP } from "@/lib/constantes";
import { EditorMensagens } from "@/features/mensagens/components/EditorMensagens";
import { contextoDoPerfil, modeloPadrao, TIPOS_MENSAGEM, todosOsModelos, type TipoMensagem } from "@/features/mensagens/modelos";

export const metadata: Metadata = { title: "Mensagens" };

export default async function PaginaMensagens() {
  const perfil = await obterPerfil();
  if (!perfil) redirect("/aguardando-aprovacao");

  const padroes = Object.fromEntries(TIPOS_MENSAGEM.map((t) => [t, modeloPadrao(t, perfil.tratamento)])) as Record<TipoMensagem, string>;

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mensagens do WhatsApp</h1>
        <p className="text-sm text-muted-foreground">
          Monte os textos do seu jeito, com emoji e tudo. Nome, dia, hora, serviço, valor e endereço entram sozinhos na hora de enviar.
        </p>
      </div>
      <EditorMensagens modelos={todosOsModelos(perfil)} padroes={padroes} contexto={contextoDoPerfil(perfil, URL_APP)} />
    </div>
  );
}
