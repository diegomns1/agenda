"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2Icon, CopyIcon, KeyRoundIcon, Loader2Icon, QrCodeIcon, UnplugIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { IconeWhatsApp } from "@/components/marca/IconeWhatsApp";
import { formatarTelefone, mascararTelefone } from "@/lib/telefone";
import { conectarWhatsapp, desconectarWhatsapp, salvarLembreteAutomatico, situacaoWhatsapp, type SituacaoWhatsapp } from "../actions";
import { MENSAGEM_LEMBRETE_2H, MENSAGEM_LEMBRETE_DIA } from "../opcoes";
import { preencher, valoresDeExemplo } from "@/features/mensagens/modelos";

type Jeito = "codigo" | "qr";

function pareceCelular() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

const semAssinatura = () => () => {};

/** "ABCD1234" → "ABCD-1234" */
function formatarCodigo(c: string) {
  return c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}

/** Cartão "Conectar meu WhatsApp" na tela de Lembretes. */
export function ConectarWhatsapp({ inicial, telefonePerfil }: { inicial: SituacaoWhatsapp; telefonePerfil: string | null }) {
  const router = useRouter();
  const [s, setS] = useState<SituacaoWhatsapp>(inicial);
  // no celular, o padrão é o código (não dá para ler QR na própria tela); no computador, o QR
  const celular = useSyncExternalStore(semAssinatura, pareceCelular, () => false);
  const [escolha, setJeito] = useState<Jeito | null>(null);
  const jeito: Jeito = escolha ?? (celular ? "codigo" : "qr");
  const [telefone, setTelefone] = useState(mascararTelefone(telefonePerfil ?? ""));
  const [ciente, setCiente] = useState(false);
  const [expirou, setExpirou] = useState(false);
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  const [pendente, iniciar] = useTransition();
  const estadoAnterior = useRef(inicial.estado);
  // conectado e com os lembretes ligados: o cartão fica recolhido numa linha (não empurra a lista para baixo)
  const [aberto, setAberto] = useState(!(inicial.estado === "conectado" && inicial.lembreteAtivo));

  // enquanto conecta, pergunta ao servidor de 3 em 3 s (o QR e o código mudam sozinhos)
  useEffect(() => {
    if (s.estado !== "conectando") return;
    const t = setInterval(async () => {
      const nova = await situacaoWhatsapp().catch(() => null);
      if (!nova) return;
      setS((atual) => (nova.estado === "conectando" && !nova.qr && !nova.codigo ? { ...nova, qr: atual.qr, codigo: atual.codigo } : nova));
    }, 3000);
    return () => clearInterval(t);
  }, [s.estado]);

  useEffect(() => {
    if (estadoAnterior.current === "conectando" && s.estado === "conectado") {
      toast.success("WhatsApp conectado!");
      router.refresh();
    }
    if (estadoAnterior.current === "conectando" && s.estado === "desconectado") setExpirou(true);
    estadoAnterior.current = s.estado;
  }, [s.estado, router]);

  function conectar() {
    setExpirou(false);
    iniciar(async () => {
      const r = await conectarWhatsapp({ telefone: jeito === "codigo" ? telefone : null, aceiteRisco: ciente });
      if (r.erro) toast.error(r.erro);
      setS(r);
    });
  }

  function cancelarOuSair() {
    iniciar(async () => {
      await desconectarWhatsapp();
      setS({ estado: "desconectado", numero: null, nomePerfil: null, qr: null, codigo: null });
      setConfirmarSaida(false);
      router.refresh();
    });
  }

  async function copiar(codigo: string) {
    try {
      await navigator.clipboard.writeText(codigo);
      toast.success("Código copiado.");
    } catch {
      toast.error("Não consegui copiar. Digite o código.");
    }
  }

  if (s.estado === "conectado" && !aberto) {
    return (
      // min-w-0: a página é uma grade; sem isso, um texto comprido alarga a tela inteira no celular
      <div className="flex min-w-0 items-center gap-3 rounded-2xl border bg-card px-4 py-3">
        <IconeWhatsApp className="size-5 shrink-0 text-whatsapp" />
        <p className="min-w-0 flex-1 text-sm">
          <span className="block font-semibold">Lembretes automáticos ligados</span>
          <span className="block text-pretty text-muted-foreground">
            1 dia e 2 horas antes{s.numero ? `, do seu WhatsApp ${formatarTelefone(s.numero)}` : ""}
          </span>
        </p>
        <Button variant="outline" size="sm" onClick={() => setAberto(true)}>
          Configurar
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconeWhatsApp className="size-4 text-whatsapp" />
          Lembrete pelo seu WhatsApp
        </CardTitle>
        <CardDescription>
          Conecte o seu WhatsApp e a Vaguinha manda o lembrete sozinha para quem está marcado, do seu número. Você continua usando o
          WhatsApp normalmente no celular.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4">
        {s.estado === "conectado" ? (
          <>
            <p className="flex items-center gap-2 text-sm text-sucesso-forte">
              <CheckCircle2Icon className="size-4" />
              Conectado{s.numero ? `: ${formatarTelefone(s.numero)}` : ""}
              {s.nomePerfil ? ` (${s.nomePerfil})` : ""}
            </p>
            <ConfigLembrete ativoInicial={s.lembreteAtivo ?? false} aoMudar={(ativo) => setS((atual) => ({ ...atual, lembreteAtivo: ativo }))} />
            <p className="text-sm text-muted-foreground">
              No seu celular, a Vaguinha aparece em <strong>Dispositivos conectados</strong>. Se você tirar de lá, a conexão cai e
              você recebe um aviso aqui.
            </p>
            <div className="flex flex-wrap gap-2">
              {s.lembreteAtivo ? (
                <Button className="w-fit" onClick={() => setAberto(false)}>
                  Pronto
                </Button>
              ) : null}
              <Button variant="outline" className="w-fit" onClick={() => setConfirmarSaida(true)} disabled={pendente}>
                <UnplugIcon />
                Desconectar
              </Button>
            </div>
          </>
        ) : s.estado === "conectando" ? (
          <>
            {s.codigo ? (
              <div className="grid gap-3">
                <ol className="list-decimal space-y-1 pl-5 text-sm">
                  <li>
                    Abra o <strong>WhatsApp</strong> e toque em <strong>⋮</strong> (Android) ou <strong>Configurações</strong> (iPhone).
                  </li>
                  <li>
                    <strong>Dispositivos conectados</strong> → <strong>Conectar dispositivo</strong>.
                  </li>
                  <li>
                    Embaixo, toque em <strong>Conectar com número de telefone</strong> e digite este código:
                  </li>
                </ol>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-xl border bg-muted/50 px-4 py-2 font-mono text-2xl font-semibold tracking-widest">
                    {formatarCodigo(s.codigo)}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => copiar(s.codigo!)}>
                    <CopyIcon />
                    Copiar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">O código muda a cada meio minuto. Se não aceitar, use o mais novo que aparecer aqui.</p>
              </div>
            ) : s.qr ? (
              <div className="grid gap-3">
                <ol className="list-decimal space-y-1 pl-5 text-sm">
                  <li>
                    No celular, abra o <strong>WhatsApp</strong> → <strong>⋮</strong> ou <strong>Configurações</strong> →{" "}
                    <strong>Dispositivos conectados</strong> → <strong>Conectar dispositivo</strong>.
                  </li>
                  <li>Aponte a câmera para este código:</li>
                </ol>
                {/* eslint-disable-next-line @next/next/no-img-element -- QR em base64 vindo do servidor */}
                <img src={s.qr} alt="QR Code para conectar o WhatsApp" className="size-60 rounded-xl border bg-white p-2" />
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" /> Preparando a conexão…
              </p>
            )}
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" /> Esperando você conectar no celular…
            </p>
            <Button variant="ghost" className="w-fit" onClick={cancelarOuSair} disabled={pendente}>
              Cancelar
            </Button>
          </>
        ) : (
          <>
            {expirou ? (
              <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
                O tempo para conectar acabou. Toque em <strong>Conectar</strong> de novo.
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Como conectar">
              {(
                [
                  { id: "codigo", rotulo: "Com código", explica: "Pelo próprio celular", Icone: KeyRoundIcon },
                  { id: "qr", rotulo: "Com QR Code", explica: "Pelo computador", Icone: QrCodeIcon },
                ] as const
              ).map(({ id, rotulo, explica, Icone }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={jeito === id}
                  onClick={() => setJeito(id)}
                  className={`flex min-h-toque flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    jeito === id ? "border-primary bg-primary/5" : "hover:bg-muted/60"
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <Icone className="size-4 text-primary" />
                    {rotulo}
                  </span>
                  <span className="text-xs text-muted-foreground">{explica}</span>
                </button>
              ))}
            </div>

            {jeito === "codigo" ? (
              <div className="grid gap-1.5">
                <Label htmlFor="zap-numero">Número do seu WhatsApp</Label>
                <Input
                  id="zap-numero"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(11) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
                  className="max-w-60"
                />
              </div>
            ) : null}

            <label className="flex items-start gap-2.5 rounded-xl border bg-muted/30 p-3 text-sm">
              <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-primary" checked={ciente} onChange={(e) => setCiente(e.target.checked)} />
              <span>
                Estou ciente de que essa conexão não é oficial do WhatsApp. A Vaguinha envia poucas mensagens, com intervalo e só para
                quem tem horário marcado, mas o WhatsApp pode restringir ou bloquear números que usam envio automático.
              </span>
            </label>

            <Button className="w-fit" onClick={conectar} disabled={pendente || !ciente || (jeito === "codigo" && telefone.replace(/\D/g, "").length < 10)}>
              {pendente ? <Loader2Icon className="animate-spin" /> : <IconeWhatsApp className="size-4" />}
              Conectar
            </Button>
          </>
        )}
      </CardContent>

      <AlertDialog open={confirmarSaida} onOpenChange={(v) => !pendente && setConfirmarSaida(v)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar o WhatsApp?</AlertDialogTitle>
            <AlertDialogDescription>
              Os lembretes deixam de sair sozinhos e voltam a ser pelo botão. Dá para conectar de novo quando quiser.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendente}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                cancelarOuSair();
              }}
              disabled={pendente}
            >
              {pendente ? <Loader2Icon className="animate-spin" /> : null}
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/** Liga/desliga o envio (1 dia antes e 2 horas antes, fixo) e mostra as mensagens que saem. */
function ConfigLembrete({ ativoInicial, aoMudar }: { ativoInicial: boolean; aoMudar: (ativo: boolean) => void }) {
  const [ativo, setAtivo] = useState(ativoInicial);
  const [pendente, iniciar] = useTransition();
  const exemplo = { ...valoresDeExemplo(), dia: "amanhã (sexta)", endereco: "" };

  function salvar(novo: boolean) {
    setAtivo(novo);
    iniciar(async () => {
      const r = await salvarLembreteAutomatico({ ativo: novo });
      if (!r.ok) {
        setAtivo(!novo);
        toast.error(r.erro ?? "Não consegui salvar.");
      } else {
        aoMudar(novo);
        toast.success(novo ? "Lembretes automáticos ligados." : "Lembretes automáticos desligados.");
      }
    });
  }

  return (
    <div className="grid gap-3 rounded-xl border p-3">
      <label className="flex items-center justify-between gap-3">
        <span className="grid gap-0.5">
          <span className="text-sm font-semibold">Mandar lembretes sozinha</span>
          <span className="text-xs text-muted-foreground">1 dia antes e 2 horas antes de cada atendimento</span>
        </span>
        <Switch checked={ativo} onCheckedChange={salvar} disabled={pendente} aria-label="Mandar lembretes sozinha" />
      </label>
      {ativo ? (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { titulo: "1 dia antes", texto: MENSAGEM_LEMBRETE_DIA },
              { titulo: "2 horas antes", texto: MENSAGEM_LEMBRETE_2H },
            ].map((m) => (
              <div key={m.titulo} className="grid gap-1">
                <span className="text-xs font-medium text-muted-foreground">{m.titulo}</span>
                <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm whitespace-pre-wrap">{preencher(m.texto, exemplo)}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Saem entre 7h e 21h, com alguns minutos entre uma mensagem e outra. Quem você já avisou na mão não recebe o de 1 dia.
          </p>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">Desligado: os lembretes continuam pelo botão, como antes.</p>
      )}
    </div>
  );
}
