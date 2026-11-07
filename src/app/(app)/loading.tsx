import { Skeleton } from "@/components/ui/skeleton";

/** Esqueleto mostrado na hora do toque, enquanto a página carrega os dados. */
export default function Carregando() {
  return (
    <div className="grid gap-5" aria-busy="true" aria-label="Carregando">
      <div className="grid gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <div className="grid gap-2 rounded-xl border p-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
