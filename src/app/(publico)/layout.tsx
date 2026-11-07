import { CalendarHeartIcon } from "lucide-react";
import { NOME_APP } from "@/lib/constantes";

export default function LayoutPublico({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-muted/40 px-4 py-10">
      <div className="mb-6 flex items-center gap-2 text-primary">
        <CalendarHeartIcon className="size-7" />
        <span className="text-2xl font-semibold tracking-tight">{NOME_APP}</span>
      </div>
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-sm ring-1 ring-foreground/10">
        {children}
      </div>
    </div>
  );
}
