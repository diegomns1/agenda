"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { BellIcon, BellOffIcon, BellRingIcon, Loader2Icon, SmartphoneIcon } from "lucide-react";
import { enviarPushTeste, removerInscricaoPush, salvarInscricaoPush } from "@/features/lembretes/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Estado = "carregando" | "sem_suporte" | "bloqueado" | "inativo" | "ativo";

function base64ParaUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function ehIosSemApp() {
  if (typeof navigator === "undefined") return false;
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const instalado = window.matchMedia?.("(display-mode: standalone)").matches || ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true);
  return ios && !instalado;
}

export function AtivarNotificacoes({ aparelhos }: { aparelhos: number }) {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [iosSemApp, setIosSemApp] = useState(false);
  const [pendente, iniciar] = useTransition();
  const chavePublica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    let ativo = true;
    (async () => {
      const suportado = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && !!chavePublica;
      const ios = ehIosSemApp();
      if (!suportado) {
        if (ativo) {
          setIosSemApp(ios);
          setEstado("sem_suporte");
        }
        return;
      }
      if (Notification.permission === "denied") {
        if (ativo) setEstado("bloqueado");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (ativo) setEstado(sub ? "ativo" : "inativo");
    })().catch(() => ativo && setEstado("sem_suporte"));
    return () => {
      ativo = false;
    };
  }, [chavePublica]);

  function ativar() {
    iniciar(async () => {
      try {
        const permissao = await Notification.requestPermission();
        if (permissao !== "granted") {
          setEstado(permissao === "denied" ? "bloqueado" : "inativo");
          toast.error("Permissão não concedida.");
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ParaUint8Array(chavePublica!) }));
        const r = await salvarInscricaoPush(sub.toJSON());
        if (r.ok) {
          setEstado("ativo");
          toast.success(r.mensagem);
        } else toast.error(r.erro ?? "Não foi possível ativar.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Não foi possível ativar as notificações.");
      }
    });
  }

  function desativar() {
    iniciar(async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        const r = await removerInscricaoPush(endpoint);
        if (r.ok) toast.success(r.mensagem);
      }
      setEstado("inativo");
    });
  }

  function testar() {
    iniciar(async () => {
      const r = await enviarPushTeste();
      if (r.ok) toast.success(r.mensagem);
      else toast.error(r.erro ?? "Falha no teste.");
    });
  }

  const Icone = estado === "ativo" ? BellRingIcon : estado === "bloqueado" ? BellOffIcon : BellIcon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icone className="size-4 text-primary" />
          Notificações no celular
        </CardTitle>
        <CardDescription>
          Você recebe um aviso 1 dia antes e 1 hora antes de cada atendimento, com um botão para lembrar a cliente.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {estado === "carregando" ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" /> Verificando…
          </p>
        ) : estado === "sem_suporte" ? (
          <p className="flex items-start gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
            <SmartphoneIcon className="mt-0.5 size-4 shrink-0" />
            {iosSemApp
              ? "No iPhone, primeiro adicione o app à tela de início (Compartilhar → Adicionar à Tela de Início) e abra por lá. Depois volte aqui para ativar."
              : "Este navegador não suporta notificações. Tente pelo Chrome no celular."}
          </p>
        ) : estado === "bloqueado" ? (
          <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
            As notificações estão bloqueadas para este site. Libere nas configurações do navegador (ícone de cadeado ao lado do endereço) e recarregue.
          </p>
        ) : estado === "ativo" ? (
          <>
            <p className="text-sm text-emerald-700 dark:text-emerald-300">Ativas neste aparelho.</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={testar} disabled={pendente}>
                {pendente ? <Loader2Icon className="animate-spin" /> : <BellRingIcon />}
                Enviar teste
              </Button>
              <Button variant="ghost" onClick={desativar} disabled={pendente}>
                <BellOffIcon />
                Desativar aqui
              </Button>
            </div>
          </>
        ) : (
          <Button onClick={ativar} disabled={pendente} className="w-fit">
            {pendente ? <Loader2Icon className="animate-spin" /> : <BellIcon />}
            Ativar notificações neste aparelho
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          {aparelhos === 0 ? "Nenhum aparelho cadastrado ainda." : `${aparelhos} aparelho${aparelhos === 1 ? "" : "s"} com notificações ativas.`}
        </p>
      </CardContent>
    </Card>
  );
}
