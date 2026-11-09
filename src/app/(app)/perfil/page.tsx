import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreditCardIcon } from "lucide-react";
import { obterPerfil } from "@/lib/auth";
import { URL_APP } from "@/lib/constantes";
import { formatarDataISO } from "@/lib/datas";
import { PLANOS, temRecurso } from "@/lib/planos";
import { Button } from "@/components/ui/button";
import { FalarComSuporte } from "@/components/layout/FalarComSuporte";
import { FormPerfil } from "@/features/perfil/components/FormPerfil";
import { UploadLogo } from "@/features/perfil/components/UploadLogo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ConectarWhatsApp } from "@/features/whatsapp/components/ConectarWhatsApp";
import { descreverNumero, NUMERO_ASSISTENTE } from "@/features/whatsapp/numero";

export const metadata: Metadata = { title: "Perfil" };

export default async function PaginaPerfil() {
  const perfil = await obterPerfil();
  if (!perfil) redirect("/aguardando-aprovacao");

  // assistente no WhatsApp: o quadro só aparece depois que o número da Vaguinha estiver configurado
  const whatsappLigado = Boolean(NUMERO_ASSISTENTE);
  const { data: vinculo } = whatsappLigado
    ? await (await criarClienteServidor()).from("whatsapp_vinculos").select("telefone").eq("profissional_id", perfil.id).maybeSingle()
    : { data: null };

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
        <p className="text-sm text-muted-foreground">Sua marca, seus horários e sua mensagem de lembrete.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sua logo</CardTitle>
          <CardDescription>Aparece nos stories e no topo do app.</CardDescription>
        </CardHeader>
        <CardContent>
          <UploadLogo usuarioId={perfil.id} logoUrl={perfil.logo_url} />
        </CardContent>
      </Card>

      <FormPerfil perfil={perfil} urlBase={URL_APP} podeAgendamentoOnline={temRecurso(perfil.plano, "agendamento_online")} />

      {whatsappLigado ? (
        <ConectarWhatsApp conectado={vinculo ? descreverNumero(vinculo.telefone) : null} permitido={temRecurso(perfil.plano, "assistente")} />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Assinatura</CardTitle>
          <CardDescription>
            Plano <strong>{PLANOS[perfil.plano].nome}</strong>
            {perfil.ativa_ate ? ` · acesso até ${formatarDataISO(perfil.ativa_ate)}` : perfil.plano === "teste" ? " · teste grátis" : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/assinatura">
              <CreditCardIcon />
              Ver plano e mensalidades
            </Link>
          </Button>
        </CardContent>
      </Card>

      <FalarComSuporte nome={perfil.nome} email={perfil.email} />
    </div>
  );
}
