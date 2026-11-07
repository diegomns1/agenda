"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { salvarPerfil } from "@/features/perfil/actions";
import { Campo } from "@/components/formulario/Campo";
import { BotaoEnviar } from "@/components/formulario/BotaoEnviar";
import { Aviso } from "@/components/formulario/Aviso";
import { ESTADO_INICIAL, type EstadoForm } from "@/components/formulario/tipos";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatarTelefone } from "@/lib/telefone";
import type { Profile } from "@/types/database";
import { SeletorCores, type Cores } from "./SeletorCores";
import { Expediente } from "./Expediente";
import { PreviewMarca } from "./PreviewMarca";

const EXEMPLO = { nome: "Maria", dia: "amanhã (sexta)", hora: "14:30", servico: "manicure" };

function preencherModelo(modelo: string) {
  return modelo
    .replaceAll("{nome}", EXEMPLO.nome)
    .replaceAll("{dia}", EXEMPLO.dia)
    .replaceAll("{hora}", EXEMPLO.hora)
    .replaceAll("{servico}", EXEMPLO.servico);
}

async function salvarComToast(estado: EstadoForm, formData: FormData) {
  const r = await salvarPerfil(estado, formData);
  if (r.ok && r.mensagem) toast.success(r.mensagem);
  else if (r.erro) toast.error(r.erro);
  return r;
}

export function FormPerfil({ perfil }: { perfil: Profile }) {
  const [estado, acao] = useActionState(salvarComToast, ESTADO_INICIAL);
  const [cores, setCores] = useState<Cores>({ primaria: perfil.cor_primaria, secundaria: perfil.cor_secundaria });
  const [nome, setNome] = useState(perfil.nome);
  const [nomeNegocio, setNomeNegocio] = useState(perfil.nome_negocio ?? "");
  const [instagram, setInstagram] = useState(perfil.instagram ?? "");
  const [modelo, setModelo] = useState(perfil.modelo_lembrete);

  const v = estado.valores;

  return (
    <form action={acao} className="grid gap-5" noValidate>
      {estado.erro ? <Aviso>{estado.erro}</Aviso> : null}

      <Card>
        <CardHeader>
          <CardTitle>Seus dados</CardTitle>
          <CardDescription>Como você e seu negócio aparecem para as clientes.</CardDescription>
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
            placeholder="Ex.: Studio Ana Nails"
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

      <Card>
        <CardHeader>
          <CardTitle>Horário de atendimento</CardTitle>
          <CardDescription>Define os horários livres na agenda e nos stories.</CardDescription>
        </CardHeader>
        <CardContent>
          <Expediente inicial={perfil.expediente} intervaloInicial={perfil.intervalo_grade_min} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mensagem de lembrete</CardTitle>
          <CardDescription>
            Texto que vai pronto para o WhatsApp da cliente. Você pode usar{" "}
            <code className="rounded bg-muted px-1">{"{nome}"}</code>,{" "}
            <code className="rounded bg-muted px-1">{"{dia}"}</code>,{" "}
            <code className="rounded bg-muted px-1">{"{hora}"}</code> e{" "}
            <code className="rounded bg-muted px-1">{"{servico}"}</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="modelo_lembrete">Modelo</Label>
            <Textarea
              id="modelo_lembrete"
              name="modelo_lembrete"
              rows={3}
              maxLength={400}
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              className="text-base"
            />
            {estado.erros?.modelo_lembrete?.[0] ? (
              <p className="text-sm text-destructive">{estado.erros.modelo_lembrete[0]}</p>
            ) : null}
          </div>
          <div className="rounded-lg bg-[#e7ffdb] px-3 py-2 text-sm text-neutral-900 dark:bg-[#1f3d2a] dark:text-neutral-100">
            <p className="mb-1 text-xs font-medium opacity-60">Exemplo de como a cliente vê</p>
            <p className="whitespace-pre-wrap">{preencherModelo(modelo)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-20 z-10 sm:bottom-4">
        <BotaoEnviar textoCarregando="Salvando..." className="shadow-lg">
          Salvar perfil
        </BotaoEnviar>
      </div>
    </form>
  );
}
