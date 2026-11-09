"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/*
 * Voz do assistente usando o que o próprio navegador/celular já tem (custo zero):
 * só OUVIR, com SpeechRecognition (Chrome/Android, Safari/iPhone, Edge). Firefox não tem: o botão some.
 * A assistente responde só por escrito (decisão do Diego em 09/11/2026: "só eu falo por voz").
 */

type ResultadoFala = { isFinal: boolean; 0: { transcript: string } };
type EventoResultado = { resultIndex: number; results: ArrayLike<ResultadoFala> };
type Reconhecedor = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: EventoResultado) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type ConstrutorReconhecedor = new () => Reconhecedor;

function construtor(): ConstrutorReconhecedor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: ConstrutorReconhecedor; webkitSpeechRecognition?: ConstrutorReconhecedor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const nada = () => () => {};
const MENSAGENS_ERRO: Record<string, string> = {
  "not-allowed": "O microfone está bloqueado. Libere o microfone para este site nas configurações do navegador.",
  "service-not-allowed": "O microfone está bloqueado. Libere o microfone para este site nas configurações do navegador.",
  "no-speech": "Não ouvi nada. Toque no microfone e fale de novo.",
  "audio-capture": "Não achei um microfone neste aparelho.",
  network: "Sem internet para entender a voz. Tente de novo ou escreva.",
};

export function useVoz({ aoTerminarDeOuvir }: { aoTerminarDeOuvir: (texto: string) => void }) {
  const podeOuvir = useSyncExternalStore(nada, () => construtor() !== null, () => false);
  const [ouvindo, setOuvindo] = useState(false);
  const [parcial, setParcial] = useState("");
  const [erroVoz, setErroVoz] = useState<string | null>(null);
  const reconhecedor = useRef<Reconhecedor | null>(null);
  const textoFinal = useRef("");
  const callback = useRef(aoTerminarDeOuvir);
  useEffect(() => {
    callback.current = aoTerminarDeOuvir;
  }, [aoTerminarDeOuvir]);

  const ouvir = useCallback(() => {
    const C = construtor();
    if (!C) return;
    reconhecedor.current?.abort();
    const r = new C();
    r.lang = "pt-BR";
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 1;
    textoFinal.current = "";
    setParcial("");
    setErroVoz(null);
    r.onresult = (e) => {
      let finais = "";
      let provisorio = "";
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finais += res[0].transcript;
        else provisorio += res[0].transcript;
      }
      textoFinal.current = finais;
      setParcial((finais + provisorio).trim());
    };
    r.onerror = (e) => {
      if (e.error !== "aborted") setErroVoz(MENSAGENS_ERRO[e.error] ?? "Não consegui ouvir. Tente de novo ou escreva.");
    };
    r.onend = () => {
      setOuvindo(false);
      const texto = textoFinal.current.trim();
      setParcial("");
      reconhecedor.current = null;
      if (texto) callback.current(texto);
    };
    reconhecedor.current = r;
    try {
      r.start();
      setOuvindo(true);
    } catch {
      setErroVoz("Não consegui ligar o microfone. Tente de novo.");
    }
  }, []);

  const pararDeOuvir = useCallback(() => reconhecedor.current?.stop(), []);

  // ao sair da tela: para de ouvir
  useEffect(() => () => reconhecedor.current?.abort(), []);

  return { podeOuvir, ouvindo, parcial, erroVoz, limparErroVoz: () => setErroVoz(null), ouvir, pararDeOuvir };
}
