import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/auth";
import { ehDataISO, hojeISO } from "@/lib/datas";
import { temRecurso } from "@/lib/planos";
import { GeradorStories } from "@/features/stories/components/GeradorStories";
import { listarServicos } from "@/features/servicos/queries";
import { BloqueioPlano } from "@/components/layout/BloqueioPlano";
import { historicoImagens } from "@/features/imagens-ia/actions";
import { ChatImagens } from "@/features/imagens-ia/components/ChatImagens";
import { geracaoImagemConfigurada } from "@/features/imagens-ia/openai";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Stories" };

export default async function PaginaStories({ searchParams }: PageProps<"/stories">) {
  const sp = await searchParams;
  const perfil = await obterPerfil();
  if (!perfil) redirect("/aguardando-aprovacao");

  if (!temRecurso(perfil.plano, "stories")) {
    return (
      <BloqueioPlano
        recurso="stories"
        planoAtual={perfil.plano}
        titulo="Stories"
        descricao="Imagens prontas para o Instagram com sua logo e suas cores."
        beneficios={[
          "Criar com IA: descreva a imagem, anexe fotos e receba o story pronto (30 por mês)",
          "Agenda do dia, da semana e do mês com seus horários livres",
          "Tabela de serviços e valores com a sua marca",
          "Temas de Natal, Ano Novo, Dia da Mulher, Outubro Rosa e Novembro Azul",
          "Compartilhar direto no Instagram pelo celular",
        ]}
      />
    );
  }

  const dataInicial = ehDataISO(sp.data) && sp.data >= hojeISO() ? sp.data : undefined;
  // duas abas: "Criar com IA" (chat que gera imagem) e "Modelos prontos" (agenda, serviços, temas).
  // Links antigos com ?tipo=... (ex.: "Divulgar" do horário que vagou) abrem direto nos modelos prontos.
  const temIA = geracaoImagemConfigurada();
  const aba: "ia" | "prontos" = !temIA || sp.aba === "prontos" || typeof sp.tipo === "string" ? "prontos" : "ia";
  const [servicos, historico] = await Promise.all([
    aba === "prontos" ? listarServicos({ somenteAtivos: true }) : Promise.resolve([]),
    aba === "ia" ? historicoImagens() : Promise.resolve(null),
  ]);

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Stories</h1>
        <p className="text-sm text-muted-foreground">
          Imagens prontas para o Instagram com sua logo e suas cores.{" "}
          {!perfil.logo_url ? (
            <Link href="/perfil" className="underline underline-offset-4">
              Envie sua logo
            </Link>
          ) : null}
        </p>
      </div>
      {temIA ? (
        <nav aria-label="Jeito de criar" className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 sm:w-fit">
          {(
            [
              { id: "ia", rotulo: "Criar com IA", href: "/stories" },
              { id: "prontos", rotulo: "Modelos prontos", href: "/stories?aba=prontos" },
            ] as const
          ).map((t) => (
            <Link
              key={t.id}
              href={t.href}
              aria-current={aba === t.id ? "page" : undefined}
              className={cn(
                "flex min-h-toque items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors",
                aba === t.id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.rotulo}
            </Link>
          ))}
        </nav>
      ) : null}

      {aba === "ia" && historico ? (
        <ChatImagens inicial={historico.itens} usadasInicial={historico.usadas} limite={historico.limite} />
      ) : (
        <GeradorStories
          hoje={hojeISO()}
          corPrimaria={perfil.cor_primaria}
          corSecundaria={perfil.cor_secundaria}
          expediente={perfil.expediente}
          intervaloMin={perfil.intervalo_grade_min}
          servicos={servicos.map((s) => ({ id: s.id, nome: s.nome, valor: s.valor }))}
          // ex.: /stories?tipo=dia&data=2026-11-14&hora=15:00 (botão "Divulgar" do aviso de horário que vagou)
          tipoInicial={sp.tipo === "dia" || sp.tipo === "semana" || sp.tipo === "mes" || sp.tipo === "servicos" ? sp.tipo : undefined}
          dataInicial={dataInicial}
          horaInicial={dataInicial && typeof sp.hora === "string" && /^\d{2}:\d{2}$/.test(sp.hora) ? sp.hora : undefined}
        />
      )}
    </div>
  );
}
