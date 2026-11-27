import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { PLANOS } from "@/lib/constantes";
import { formatarData, formatarDataISO } from "@/lib/datas";
import { formatarTelefone } from "@/lib/telefone";
import { nomeDoRamo } from "@/lib/ramos";
import type { Profile } from "@/types/database";
import { cn } from "@/lib/utils";
import { NIVEL_USO, type UsoConta } from "../uso";
import type { SituacaoPagamento } from "../pagamentos";
import { BadgeStatus } from "./BadgeStatus";

function haQuanto(iso: string | null) {
  if (!iso) return "nunca";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 60) return `há ${Math.max(1, min)} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return `há ${d} dia${d === 1 ? "" : "s"}`;
}

function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`;
}

/** Linha de uso: só números (o admin não vê nomes nem horários de ninguém). */
type Chamada = { tipo: string; canal: string; enviado_em: string };

function LinhaUso({ u, chamada }: { u: UsoConta; chamada?: Chamada }) {
  const nivel = NIVEL_USO[u.nivel];
  const partes = [
    plural(u.servicos, "serviço", "serviços"),
    plural(u.clientes, "cliente", "clientes"),
    `${plural(u.marcados, "horário marcado", "horários marcados")}${u.importados ? ` + ${u.importados} importados` : ""}`,
    u.pelolink ? `${u.pelolink} pelo link` : null,
    u.notificacoes ? "notificações ligadas" : null,
    u.whatsapp ? "WhatsApp conectado" : null,
    u.logo ? "com logo" : null,
  ].filter(Boolean);
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <span className={cn("rounded-full px-2 py-0.5 font-semibold", nivel.tom)} title={nivel.explica}>
        {nivel.rotulo}
      </span>
      <span className="text-muted-foreground">
        {partes.join(" · ")} · último acesso {haQuanto(u.ultimoAcesso)}
        {u.ultimaAtividade ? ` · mexeu ${haQuanto(u.ultimaAtividade)}` : ""}
        {chamada
          ? ` · chamada (${chamada.tipo === "ajuda_inicio" ? "ajuda" : chamada.tipo === "parou" ? "parou" : "feedback"}, ${chamada.canal === "whatsapp" ? "WhatsApp" : "e-mail"}) ${haQuanto(chamada.enviado_em)}`
          : ""}
      </span>
    </div>
  );
}

const real = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

/** Selo de pagamento: assinante, mensalidade atrasada ou cobrança gerada e não paga (27/11/2026). */
function LinhaPagamento({ s }: { s: SituacaoPagamento }) {
  const selo =
    s.tipo === "assinante"
      ? { texto: "Assinante", tom: "bg-sucesso text-sucesso-texto" }
      : s.tipo === "atrasada"
        ? { texto: "Mensalidade atrasada", tom: "bg-destructive/10 text-destructive" }
        : { texto: s.aberta?.forma === "PIX" ? "Pix gerado, não pago" : "Cobrança gerada, não paga", tom: "bg-aviso text-aviso-texto" };
  const partes = [
    s.escolheu ? `escolheu o ${PLANOS[s.escolheu].nome}` : null,
    s.pagas ? `${plural(s.pagas, "mensalidade paga", "mensalidades pagas")} (${real(s.totalPago)})` : null,
    s.aberta ? `${real(s.aberta.valor)} em aberto desde ${formatarDataISO(s.aberta.vencimento)}` : null,
    s.trocaPara ? `trocou para ${PLANOS[s.trocaPara].nome}: vale a partir da próxima mensalidade` : null,
  ].filter(Boolean);
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <span className={cn("rounded-full px-2 py-0.5 font-semibold", selo.tom)}>{selo.texto}</span>
      <span className="text-muted-foreground">{partes.join(" · ")}</span>
    </div>
  );
}

export function ListaContas({
  contas,
  uso,
  chamadas,
  pagamentos,
}: {
  contas: Profile[];
  uso?: Map<string, UsoConta>;
  chamadas?: Map<string, Chamada>;
  pagamentos?: Map<string, SituacaoPagamento>;
}) {
  if (contas.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
        Nenhuma conta aqui.
      </p>
    );
  }

  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card">
      {contas.map((c) => (
        <li key={c.id}>
          <Link
            href={`/admin/contas/${c.id}`}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-medium">{c.nome}</span>
                <BadgeStatus status={c.status} />
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {c.email}
                {c.telefone ? ` · ${formatarTelefone(c.telefone)}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {c.ramo ? `${nomeDoRamo(c.ramo, c.ramo_outro)} · ` : ""}
                {PLANOS[c.plano]?.nome ?? c.plano}
                {c.ativa_ate ? ` até ${formatarDataISO(c.ativa_ate)}` : ""}
                {" · cadastro em "}
                {formatarData(c.created_at, "dd/MM/yyyy")}
              </p>
              {pagamentos?.get(c.id) ? <LinhaPagamento s={pagamentos.get(c.id)!} /> : null}
              {uso?.get(c.id) ? <LinhaUso u={uso.get(c.id)!} chamada={chamadas?.get(c.id)} /> : null}
            </div>
            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
