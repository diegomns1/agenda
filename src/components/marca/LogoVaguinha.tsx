import { cn } from "@/lib/utils";

type Props = {
  variante?: "horizontal" | "vertical" | "simbolo";
  className?: string;
};

/**
 * Logo oficial do Vaguinha (arquivos em public/marca).
 * No modo escuro troca para a versão clara automaticamente.
 */
export function LogoVaguinha({ variante = "horizontal", className }: Props) {
  if (variante === "simbolo") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/marca/simbolo-vinho.svg" alt="Vaguinha" className={cn("h-8 w-auto", className)} />;
  }
  const clara = `/marca/logo-${variante}-clara.svg`;
  const escura = `/marca/logo-${variante}.svg`;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={escura} alt="Vaguinha" className={cn("h-8 w-auto dark:hidden", className)} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={clara} alt="Vaguinha" className={cn("hidden h-8 w-auto dark:block", className)} />
    </>
  );
}
