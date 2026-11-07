import { LogoVaguinha } from "@/components/marca/LogoVaguinha";

export default function LayoutPublico({ children }: { children: React.ReactNode }) {
  return (
    <div className="fundo-aurora flex flex-1 flex-col items-center justify-center bg-background px-4 py-10">
      <div className="surgir flutuar mb-8">
        <LogoVaguinha variante="vertical" className="h-28 w-auto drop-shadow-sm" />
      </div>
      <div className="surgir surgir-atraso-1 w-full max-w-sm rounded-3xl bg-card/90 p-6 shadow-xl shadow-vinho/10 ring-1 ring-vinho/10 backdrop-blur">
        {children}
      </div>
      <p className="surgir surgir-atraso-2 mt-6 text-xs text-muted-foreground">
        Agenda para profissionais autônomas · vaguinha.app
      </p>
    </div>
  );
}
