import { LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Formulário comum para /auth/sair (funciona mesmo em aba aberta antes de um deploy). */
export function BotaoSair({ variante = "ghost" }: { variante?: "ghost" | "outline" }) {
  return (
    <form method="post" action="/auth/sair">
      <Button type="submit" variant={variante} size="sm">
        <LogOutIcon />
        Sair
      </Button>
    </form>
  );
}
