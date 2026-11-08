import { cn } from "@/lib/utils";
import { VISUAL_BLOQUEIO, VISUAL_DATA, VISUAL_STATUS, type VisualStatus } from "@/features/agenda/visual";

const ITENS: VisualStatus[] = [
  VISUAL_STATUS.agendado,
  VISUAL_STATUS.pendente,
  VISUAL_STATUS.concluido,
  VISUAL_STATUS.faltou,
  VISUAL_BLOQUEIO,
];

/** Legenda em etiquetas (no lugar de uma frase para decorar). */
export function LegendaAgenda({ className, comDatas = true }: { className?: string; comDatas?: boolean }) {
  const itens = comDatas ? [...ITENS, { ...VISUAL_DATA.feriado, cartao: "" }] : ITENS;
  return (
    <ul aria-label="Legenda das cores" className={cn("flex flex-wrap gap-1.5", className)}>
      {itens.map((v) => (
        // mesma aparência das pílulas da agenda (chip), não da etiqueta do detalhe
        <li key={v.rotulo} className={cn("inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-0.5 text-xs font-medium", v.chip)}>
          {v.Icone ? <v.Icone className="size-3" aria-hidden /> : null}
          {v.rotulo === "Aguardando confirmação" ? "Aguardando" : v.rotulo}
        </li>
      ))}
    </ul>
  );
}
