"use client";

import { startTransition, useActionState, useState } from "react";
import { toast } from "sonner";
import { salvarPerfil } from "@/features/perfil/actions";
import { Campo } from "@/components/formulario/Campo";
import { BotaoEnviar } from "@/components/formulario/BotaoEnviar";
import { Aviso } from "@/components/formulario/Aviso";
import { ESTADO_INICIAL, type EstadoForm } from "@/components/formulario/tipos";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatarTelefone } from "@/lib/telefone";
import type { Profile } from "@/types/database";
import { SeletorCores, type Cores } from "./SeletorCores";
import { Expediente } from "./Expediente";
import { PreviewMarca } from "./PreviewMarca";
import { LinkAgendamento } from "./LinkAgendamento";
import { Switch } from "@/components/ui/switch";
import { LockIcon, PaletteIcon } from "lucide-react";
import { SeletorRamo } from "@/components/formulario/SeletorRamo";
import { EscolhaTratamento } from "@/components/formulario/EscolhaTratamento";
import { obterRamo, TEMAS_PAINEL, type TemaPainel, type Tratamento } from "@/lib/ramos";
import { cn } from "@/lib/utils";
import Link from "next/link";


async function salvarComToast(estado: EstadoForm, formData: FormData) {
  const r = await salvarPerfil(estado, formData);
  if (r.ok && r.mensagem) toast.success(r.mensagem);
  else if (r.erro) toast.error(r.erro);
  return r;
}

type PropsForm = {
  perfil: Profile;
  /** Base do link público, ex.: https://painel.vaguinha.app */
  urlBase: string;
  /** O plano inclui agendamento pela cliente? */
  podeAgendamentoOnline: boolean;
};

function slugDe(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function FormPerfil({ perfil, urlBase, podeAgendamentoOnline }: PropsForm) {
  const [estado, acao, salvando] = useActionState(salvarComToast, ESTADO_INICIAL);
  const [slug, setSlug] = useState(perfil.slug ?? slugDe(perfil.nome_negocio || perfil.nome));
  const [online, setOnline] = useState(perfil.agendamento_online);
  const [cores, setCores] = useState<Cores>({ primaria: perfil.cor_primaria, secundaria: perfil.cor_secundaria });
  const [nome, setNome] = useState(perfil.nome);
  const [nomeNegocio, setNomeNegocio] = useState(perfil.nome_negocio ?? "");
  const [instagram, setInstagram] = useState(perfil.instagram ?? "");
  const [tema, setTema] = useState<TemaPainel>(perfil.tema ?? "rosa");

  const v = estado.valores;

  return (
    // Enviado por onSubmit (e não por `action=`) de propósito: com `action`, o React 19 reseta o formulário
    // após salvar e os Switch do Radix voltam ao valor inicial da página ("Link ativo" e dias do expediente).
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        startTransition(() => acao(dados));
      }}
      className="grid gap-5"
      noValidate
    >
      {estado.erro ? <Aviso>{estado.erro}</Aviso> : null}

      <Card id="ramo">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PaletteIcon className="size-4 text-primary" />
            Seu ramo e a cara do painel
          </CardTitle>
          <CardDescription>O ramo ajusta as palavras e as sugestões de serviço. O tema troca as cores do seu painel.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <SeletorRamo ramoInicial={v?.ramo ?? perfil.ramo} outroInicial={v?.ramo_outro ?? perfil.ramo_outro} erro={estado.erros?.ramo?.[0]} />
          <EscolhaTratamento inicial={(v?.tratamento as Tratamento | undefined) ?? perfil.tratamento} erro={estado.erros?.tratamento?.[0]} />
          <div className="grid gap-1.5">
            <span className="text-sm font-medium">Tema do painel</span>
            <input type="hidden" name="tema" value={tema} />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Tema do painel">
              {(Object.keys(TEMAS_PAINEL) as TemaPainel[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={tema === t}
                  onClick={() => setTema(t)}
                  className={cn(
                    "min-h-toque sm:min-h-0 flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-sm transition-colors",
                    tema === t ? "border-primary ring-1 ring-primary" : "hover:bg-muted",
                  )}
                >
                  <span className="flex shrink-0 -space-x-1.5">
                    {TEMAS_PAINEL[t].cores.map((c) => (
                      <span key={c} className="size-4 rounded-full ring-2 ring-background" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="truncate">{TEMAS_PAINEL[t].nome}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Vale só para o seu painel. A página do seu link usa as cores da sua marca, logo abaixo.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seus dados</CardTitle>
          <CardDescription>Como você e seu negócio aparecem para quem agenda.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Campo
            rotulo="Seu nome"
            nome="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            erros={estado.erros?.nome}
            required
          />
          <Campo
            rotulo="Nome do negócio"
            nome="nome_negocio"
            placeholder={`Ex.: ${obterRamo(perfil.ramo)?.exemplo ?? "Studio Ana Nails"}`}
            value={nomeNegocio}
            onChange={(e) => setNomeNegocio(e.target.value)}
            erros={estado.erros?.nome_negocio}
          />
          <Campo
            rotulo="WhatsApp"
            nome="telefone"
            type="tel"
            inputMode="tel"
            placeholder="(11) 99999-9999"
            defaultValue={v?.telefone ?? formatarTelefone(perfil.telefone)}
            erros={estado.erros?.telefone}
          />
          <Campo
            rotulo="Instagram"
            nome="instagram"
            placeholder="seu.perfil"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            dica="Só o nome de usuário, sem @"
            erros={estado.erros?.instagram}
          />
          <Campo
            rotulo="Endereço do atendimento (opcional)"
            nome="endereco"
            placeholder="Rua, número - bairro"
            defaultValue={v?.endereco ?? perfil.endereco ?? ""}
            maxLength={200}
            dica="Vai nas mensagens do WhatsApp no campo {endereco}. Vazio, a linha do endereço não aparece."
            erros={estado.erros?.endereco}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suas cores</CardTitle>
          <CardDescription>Usadas nos stories e nos materiais que o app gera para você.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <PreviewMarca
            nome={nome}
            nomeNegocio={nomeNegocio}
            instagram={instagram.replace(/^@/, "")}
            logoUrl={perfil.logo_url}
            primaria={cores.primaria}
            secundaria={cores.secundaria}
          />
          <SeletorCores valor={cores} aoMudar={setCores} />
          {estado.erros?.cor_primaria || estado.erros?.cor_secundaria ? (
            <p className="text-sm text-destructive">Cor inválida.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card id="agendamento-online">
        <CardHeader>
          <CardTitle>Link de agendamento</CardTitle>
          <CardDescription>
            Um link para colocar na bio do Instagram: quem quer marcar escolhe serviço, dia e horário livre.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {!podeAgendamentoOnline ? (
            <div className="flex items-start gap-3 rounded-xl border border-dashed px-3 py-3 text-sm">
              <LockIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              <p>
                Disponível a partir do plano <strong>Profissional</strong>.{" "}
                <Link href="/lembretes" className="underline underline-offset-4">
                  Ver detalhes
                </Link>
              </p>
            </div>
          ) : null}

          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <Label htmlFor="agendamento_online" className="font-medium">
              Link ativo
            </Label>
            <Switch id="agendamento_online" name="agendamento_online" checked={online} onCheckedChange={setOnline} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="slug">Endereço do link</Label>
            <div className="flex items-center overflow-hidden rounded-lg border border-input bg-background focus-within:ring-2 focus-within:ring-ring/40">
              <span className="hidden shrink-0 pl-3 text-sm text-muted-foreground sm:inline">{urlBase.replace(/^https?:\/\//, "")}/p/</span>
              <input
                id="slug"
                name="slug"
                value={slug}
                onChange={(e) => setSlug(slugDe(e.target.value.replace(/\s/g, "-")))}
                className="h-toque min-w-0 flex-1 bg-transparent px-3 text-base outline-none sm:h-toque"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            {estado.erros?.slug?.[0] ? (
              <p className="text-sm text-destructive">{estado.erros.slug[0]}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Só letras minúsculas, números e hífen. Ex.: studio-ana-nails</p>
            )}
          </div>

          {podeAgendamentoOnline && online && perfil.slug ? <LinkAgendamento url={`${urlBase}/p/${perfil.slug}`} /> : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="confirmacao_online">Confirmação</Label>
              <select
                id="confirmacao_online"
                name="confirmacao_online"
                defaultValue={perfil.confirmacao_online}
                className="h-toque rounded-lg border border-input bg-background px-3 text-base sm:h-toque"
              >
                <option value="manual">Eu confirmo cada pedido</option>
                <option value="automatica">Confirmar automaticamente</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="antecedencia_min_horas">Antecedência mínima</Label>
              <select
                id="antecedencia_min_horas"
                name="antecedencia_min_horas"
                defaultValue={perfil.antecedencia_min_horas}
                className="h-toque rounded-lg border border-input bg-background px-3 text-base sm:h-toque"
              >
                {[0, 1, 2, 3, 6, 12, 24, 48].map((h) => (
                  <option key={h} value={h}>
                    {h === 0 ? "Sem antecedência" : h === 1 ? "1 hora" : h < 24 ? `${h} horas` : h === 24 ? "1 dia" : "2 dias"}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Com &quot;Eu confirmo&quot;, o pedido entra na agenda como <strong>aguardando confirmação</strong> (o horário já fica reservado) e você
            recebe uma notificação para confirmar ou recusar.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horário de atendimento</CardTitle>
          <CardDescription>Define os horários livres na agenda e nos stories.</CardDescription>
        </CardHeader>
        <CardContent>
          <Expediente inicial={perfil.expediente} intervaloInicial={perfil.intervalo_grade_min} />
        </CardContent>
      </Card>

      <Card id="modelo_lembrete">
        <CardHeader>
          <CardTitle>Mensagens do WhatsApp</CardTitle>
          <CardDescription>
            Lembrete, confirmação, remarcação, cancelamento e agradecimento, com nome, dia, hora, serviço, valor e endereço
            preenchidos sozinhos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="h-toque sm:h-toque">
            <Link href="/mensagens">Editar mensagens</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="sticky bottom-20 z-10 sm:bottom-4">
        <BotaoEnviar carregando={salvando} textoCarregando="Salvando..." className="shadow-lg">
          Salvar perfil
        </BotaoEnviar>
      </div>
    </form>
  );
}
