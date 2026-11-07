import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/auth";
import { hojeISO } from "@/lib/datas";
import { temRecurso } from "@/lib/planos";
import { GeradorStories } from "@/features/stories/components/GeradorStories";
import { listarServicos } from "@/features/servicos/queries";
import { BloqueioPlano } from "@/components/layout/BloqueioPlano";

export const metadata: Metadata = { title: "Stories" };

export default async function PaginaStories() {
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
          "Agenda do dia, da semana e do mês com seus horários livres",
          "Tabela de serviços e valores com a sua marca",
          "Temas de Natal, Ano Novo, Dia da Mulher, Outubro Rosa e Novembro Azul",
          "Compartilhar direto no Instagram pelo celular",
        ]}
      />
    );
  }

  const servicos = await listarServicos({ somenteAtivos: true });

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
      <GeradorStories
        hoje={hojeISO()}
        corPrimaria={perfil.cor_primaria}
        corSecundaria={perfil.cor_secundaria}
        expediente={perfil.expediente}
        intervaloMin={perfil.intervalo_grade_min}
        servicos={servicos.map((s) => ({ id: s.id, nome: s.nome, valor: s.valor }))}
      />
    </div>
  );
}
