"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { enviarSugestao } from "../actions";
import { ESTADO_INICIAL, type EstadoForm } from "@/components/formulario/tipos";
import { BotaoEnviar } from "@/components/formulario/BotaoEnviar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = { aberto: boolean; aoMudar: (aberto: boolean) => void };

/** Caixa "Sugestões de melhorias": a profissional escreve ali mesmo e a ideia cai em Admin > Sugestões. */
export function DialogoSugestao({ aberto, aoMudar }: Props) {
  // aoMudar é o setState de quem usa (estável). A caixa fecha sozinha quando a sugestão é enviada;
  // o conteúdo do Dialog é desmontado ao fechar, então ao reabrir o campo começa limpo.
  const [estado, acao] = useActionState(async (anterior: EstadoForm, formData: FormData) => {
    const r = await enviarSugestao(anterior, formData);
    if (r.ok) {
      toast.success(r.mensagem ?? "Sugestão enviada!");
      aoMudar(false);
    } else if (r.erro) {
      toast.error(r.erro);
    }
    return r;
  }, ESTADO_INICIAL);

  return (
    <Dialog open={aberto} onOpenChange={aoMudar}>
      <DialogContent>
        <form action={acao} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Sugestões de melhorias</DialogTitle>
            <DialogDescription>
              O que faria o Vaguinha ficar melhor para você? Uma tela, um recurso, algo que atrapalha. A gente lê todas.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-1.5">
            <Label htmlFor="texto-sugestao">Sua ideia</Label>
            <Textarea
              id="texto-sugestao"
              name="texto"
              rows={5}
              maxLength={2000}
              required
              defaultValue={estado.ok ? "" : (estado.valores?.texto ?? "")}
              placeholder="Ex.: queria ver na agenda quanto vou receber no dia."
            />
            {estado.erros?.texto?.[0] ? <p className="text-sm text-destructive">{estado.erros.texto[0]}</p> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => aoMudar(false)}>
              Cancelar
            </Button>
            <BotaoEnviar size="default" className="h-8 w-auto text-sm" textoCarregando="Enviando...">
              Enviar sugestão
            </BotaoEnviar>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
