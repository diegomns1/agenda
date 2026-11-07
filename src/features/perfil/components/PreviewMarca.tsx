import { StoreIcon } from "lucide-react";

type Props = {
  nomeNegocio: string;
  nome: string;
  instagram?: string | null;
  logoUrl?: string | null;
  primaria: string;
  secundaria: string;
};

/** Cartãozinho que mostra como logo + cores vão aparecer nos stories. */
export function PreviewMarca({ nomeNegocio, nome, instagram, logoUrl, primaria, secundaria }: Props) {
  const titulo = nomeNegocio || nome || "Seu negócio";
  return (
    <div
      className="flex items-center gap-3 rounded-xl p-4"
      style={{ background: secundaria, color: primaria }}
      aria-label="Prévia da marca"
    >
      <div
        className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/80 ring-2"
        style={{ borderColor: primaria, boxShadow: `0 0 0 2px ${primaria}` }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo" className="size-full object-contain" />
        ) : (
          <StoreIcon className="size-6" style={{ color: primaria }} />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold leading-tight">{titulo}</p>
        {instagram ? <p className="truncate text-sm opacity-80">@{instagram}</p> : null}
        <p className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ background: primaria }}>
          Agenda aberta
        </p>
      </div>
    </div>
  );
}
