import type { Metadata } from "next";
import Link from "next/link";
import { LightbulbIcon } from "lucide-react";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { formatarData } from "@/lib/datas";
import { formatarTelefone, linkWhatsApp } from "@/lib/telefone";
import { BotaoMarcarLida } from "@/features/sugestoes/components/BotaoMarcarLida";
import type { Sugestao } from "@/types/database";

export const metadata: Metadata = { title: "Sugestões" };

/** Sugestões de melhorias mandadas pelas profissionais (Perfil > Falar com o suporte, ou o menu do topo). */
export default async function PaginaSugestoes() {
  const { data } = await criarClienteAdmin()
    .from("sugestoes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  const sugestoes = (data ?? []) as Sugestao[];
  const novas = sugestoes.filter((s) => !s.lida_em).length;

  return (
    <div className="grid grid-cols-1 gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sugestões de melhorias</h1>
        <p className="text-sm text-muted-foreground">
          {sugestoes.length === 0
            ? "Nenhuma sugestão ainda."
            : novas
              ? `${novas} nova${novas === 1 ? "" : "s"} para ler.`
              : "Tudo lido."}
        </p>
      </div>

      {sugestoes.length === 0 ? (
        <div className="grid justify-items-center gap-2 rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
          <LightbulbIcon className="size-6 text-primary" />
          Quando alguém mandar uma ideia pelo painel, ela aparece aqui com o nome de quem mandou.
        </div>
      ) : (
        <ul className="grid gap-3">
          {sugestoes.map((s) => (
            <li
              key={s.id}
              className={
                s.lida_em ? "rounded-2xl border bg-card p-4 opacity-75" : "rounded-2xl border border-primary/40 bg-card p-4 shadow-sm"
              }
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {s.profissional_id ? (
                      <Link href={`/admin/contas/${s.profissional_id}`} className="underline-offset-4 hover:underline">
                        {s.nome}
                      </Link>
                    ) : (
                      <>
                        {s.nome} <span className="text-xs font-normal text-muted-foreground">(conta excluída)</span>
                      </>
                    )}
                    {!s.lida_em ? (
                      <span className="ml-2 rounded-full bg-primary px-2 py-0.5 align-middle text-mini font-bold text-primary-foreground">
                        Nova
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs break-words text-muted-foreground">
                    {[s.email, s.telefone ? formatarTelefone(s.telefone) : null].filter(Boolean).join(" · ")}
                    {" · "}
                    {formatarData(s.created_at, "dd/MM/yyyy 'às' HH:mm")}
                  </p>
                </div>
                <BotaoMarcarLida id={s.id} lida={Boolean(s.lida_em)} />
              </div>
              <p className="mt-3 text-sm whitespace-pre-wrap break-words">{s.texto}</p>
              {s.telefone ? (
                <a
                  href={linkWhatsApp(s.telefone, `Oi, ${s.nome.split(" ")[0]}! Vi sua sugestão no Vaguinha: `)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  Responder no WhatsApp
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
