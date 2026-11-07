import { LogOutIcon } from "lucide-react";
import { sair } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

export function BotaoSair({ variante = "ghost" }: { variante?: "ghost" | "outline" }) {
  return (
    <form action={sair}>
      <Button type="submit" variant={variante} size="sm">
        <LogOutIcon />
        Sair
      </Button>
    </form>
  );
}
