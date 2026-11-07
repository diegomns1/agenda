import { Skeleton } from "@/components/ui/skeleton";

export default function Carregando() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-4 w-56" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-40 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <div className="grid gap-px overflow-hidden rounded-xl border">
        <Skeleton className="h-16 rounded-none" />
        <Skeleton className="h-16 rounded-none" />
        <Skeleton className="h-16 rounded-none" />
      </div>
    </div>
  );
}
