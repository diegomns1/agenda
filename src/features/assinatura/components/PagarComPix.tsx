"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckIcon, CopyIcon, ExternalLinkIcon, Loader2Icon } from "lucide-react";
import { situacaoDaMensalidade } from "@/features/assinatura/actions";
import { formatarDataISO } from "@/lib/datas";
import { Button } from "@/components/ui/button";

/*
 * Pix direto na tela de assinatura (27/11/2026).
 * Antes, o botão abria a página do Asaas em outra aba. No celular isso falhava (tela preta, aba bloqueada) e houve
 * gente que queria pagar e não conseguiu. Agora o código copia-e-cola e o QR ficam aqui: ela copia, cola no banco e
 * a tela percebe sozinha quando o pagamento cai.
 */

type Props = {
  asaasId: string;
  valor: number;
  vencimento: string;
  codigo: string;
  /** QR em PNG (base64), vindo do Asaas */
  qr: string | null;
  link: string | null;
};

const INTERVALO_MS = 6_000;
const PARAR_DEPOIS_MS = 20 * 60_000;

export function PagarComPix({ asaasId, valor, vencimento, codigo, qr, link }: Props) {
  const router = useRouter();
  const [copiado, setCopiado] = useState(false);
  const [conferindo, iniciar] = useTransition();
  const campo = useRef<HTMLTextAreaElement>(null);
  const confirmado = useRef(false);

  async function conferir(avisarSeNao: boolean) {
    if (confirmado.current) return;
    const r = await situacaoDaMensalidade(asaasId).catch(() => null);
    if (r?.paga) {
      confirmado.current = true;
      toast.success("Pagamento confirmado! Seu acesso está liberado.");
      router.refresh();
    } else if (avisarSeNao) {
      toast("Ainda não apareceu aqui. Depois de pagar, pode levar até 1 minuto.");
    }
  }

  // confere sozinho enquanto a tela está aberta (o banco costuma confirmar em segundos)
  useEffect(() => {
    const inicio = Date.now();
    const id = setInterval(() => {
      if (Date.now() - inicio > PARAR_DEPOIS_MS) return clearInterval(id);
      if (document.visibilityState === "visible") void conferir(false);
    }, INTERVALO_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- confere a mesma cobrança enquanto a tela existir
  }, [asaasId]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
    } catch {
      // navegador sem permissão de copiar: seleciona o código para ela copiar na mão
      campo.current?.select();
      document.execCommand?.("copy");
    }
    setCopiado(true);
    toast.success("Código Pix copiado. Agora cole no app do seu banco.");
    setTimeout(() => setCopiado(false), 4000);
  }

  return (
    <div id="pagar-pix" className="grid gap-4 rounded-2xl border border-primary/30 bg-card p-4">
      <div>
        <p className="text-base font-bold">Pague com Pix</p>
        <p className="text-sm text-muted-foreground">
          R$ {valor.toFixed(2).replace(".", ",")} · vencimento {formatarDataISO(vencimento)}
        </p>
      </div>

      <ol className="grid gap-1 text-sm">
        <li>1. Toque em <strong>Copiar código Pix</strong>.</li>
        <li>2. Abra o app do seu banco e escolha <strong>Pix Copia e Cola</strong>.</li>
        <li>3. Cole o código e confirme. O valor já vem preenchido.</li>
      </ol>

      <Button onClick={copiar} className="h-toque w-full text-base sm:w-auto">
        {copiado ? <CheckIcon /> : <CopyIcon />}
        {copiado ? "Código copiado" : "Copiar código Pix"}
      </Button>

      <textarea
        ref={campo}
        readOnly
        value={codigo}
        rows={3}
        aria-label="Código Pix copia e cola"
        onFocus={(e) => e.currentTarget.select()}
        className="w-full resize-none rounded-xl border bg-muted/40 p-2 font-mono text-xs break-all text-muted-foreground"
      />

      {qr ? (
        <div className="grid justify-items-center gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element -- QR gerado pelo Asaas, em base64 */}
          <img src={`data:image/png;base64,${qr}`} alt="QR Code do Pix" width={180} height={180} className="size-44 rounded-xl bg-white p-2" />
          <span className="text-xs text-muted-foreground">Ou leia o QR com o app do banco em outro celular.</span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3">
        <Button variant="outline" onClick={() => iniciar(() => conferir(true))} disabled={conferindo}>
          {conferindo ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
          Já paguei
        </Button>
        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground underline underline-offset-4">
            <ExternalLinkIcon className="size-3.5" />
            Abrir a página de pagamento
          </a>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">Assim que o pagamento cair, esta tela avisa e o acesso é liberado sozinho.</p>
    </div>
  );
}
